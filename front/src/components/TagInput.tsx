import { useState, useRef, useEffect } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { FiX, FiPlus } from 'react-icons/fi';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface Tag {
  id: string;
  name: string;
  color?: string;
  textColor?: string;
}

interface ColorPreset {
  backgroundColor: string;
  textColor: string;
}

const TAG_COLOR_PRESETS: ColorPreset[] = [
  { backgroundColor: '#2563EB', textColor: '#FFFFFF' },
  { backgroundColor: '#10B981', textColor: '#FFFFFF' },
  { backgroundColor: '#F59E0B', textColor: '#FFFFFF' },
  { backgroundColor: '#EF4444', textColor: '#FFFFFF' },
  { backgroundColor: '#8B5CF6', textColor: '#FFFFFF' },
  { backgroundColor: '#EC4899', textColor: '#FFFFFF' },
  { backgroundColor: '#06B6D4', textColor: '#FFFFFF' },
  { backgroundColor: '#84CC16', textColor: '#1F2937' },
  { backgroundColor: '#F97316', textColor: '#FFFFFF' },
  { backgroundColor: '#6366F1', textColor: '#FFFFFF' },
  { backgroundColor: '#14B8A6', textColor: '#FFFFFF' },
  { backgroundColor: '#64748B', textColor: '#FFFFFF' },
];

interface SortableTagProps {
  tag: Tag;
  onRemove: (tagId: string) => void;
  onChangeColor: (tagId: string, color: string, textColor: string) => void;
}

const SortableTag = ({ tag, onRemove, onChangeColor }: SortableTagProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tag.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: tag.color ?? '#2563EB',
    color: tag.textColor ?? '#FFFFFF',
  };

  const handleCycleColor = () => {
    const preset = TAG_COLOR_PRESETS[Math.floor(Math.random() * TAG_COLOR_PRESETS.length)];
    onChangeColor(tag.id, preset.backgroundColor, preset.textColor);
  };

  return (
    <span
      ref={setNodeRef}
      style={style}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold cursor-move select-none"
      {...attributes}
      {...listeners}
      onDoubleClick={handleCycleColor}
    >
      {tag.name}
      <button
        type="button"
        aria-label={`Quitar ${tag.name}`}
        onClick={(e) => {
          e.stopPropagation();
          onRemove(tag.id);
        }}
        className="hover:bg-white/20 rounded p-0.5 transition-colors cursor-pointer"
      >
        <FiX className="w-3 h-3" />
      </button>
    </span>
  );
};

interface TagInputProps {
  tags: Tag[];
  onChange: (tags: Tag[]) => void;
  suggestions?: Tag[];
  placeholder?: string;
  className?: string;
}

/**
 * Entrada de etiquetas reordenable (dnd-kit). Trabaja sobre estado local:
 * cada dominio decide cómo persistir las etiquetas en su backend.
 */
export const TagInput = ({
  tags,
  onChange,
  suggestions = [],
  placeholder = 'Añadir etiquetas...',
  className = '',
}: TagInputProps) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSuggestions = suggestions.filter(
    (suggestion) =>
      suggestion.name.toLowerCase().includes(inputValue.toLowerCase()) &&
      !tags.some((selected) => selected.id === suggestion.id),
  );

  const addTag = (tag?: Tag) => {
    if (tag) {
      if (!tags.some((t) => t.id === tag.id)) {
        onChange([...tags, tag]);
      }
    } else if (inputValue.trim()) {
      const preset = TAG_COLOR_PRESETS[tags.length % TAG_COLOR_PRESETS.length];
      const newTag: Tag = {
        id: `tag-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: inputValue.trim(),
        color: preset.backgroundColor,
        textColor: preset.textColor,
      };
      onChange([...tags, newTag]);
    }
    setInputValue('');
    setShowSuggestions(false);
  };

  const removeTag = (tagId: string) => {
    onChange(tags.filter((tag) => tag.id !== tagId));
  };

  const changeColor = (tagId: string, color: string, textColor: string) => {
    onChange(tags.map((tag) => (tag.id === tagId ? { ...tag, color, textColor } : tag)));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = tags.findIndex((tag) => tag.id === active.id);
      const newIndex = tags.findIndex((tag) => tag.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onChange(arrayMove(tags, oldIndex, newIndex));
      }
    }
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addTag(filteredSuggestions.length > 0 ? filteredSuggestions[0] : undefined);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1].id);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex flex-wrap items-center gap-2 p-2 backdrop-blur-sm bg-white/30 rounded-lg border border-white/30 min-h-[42px]">
          <SortableContext
            items={tags.map((t) => t.id)}
            strategy={horizontalListSortingStrategy}
          >
            {tags.map((tag) => (
              <SortableTag
                key={tag.id}
                tag={tag}
                onRemove={removeTag}
                onChangeColor={changeColor}
              />
            ))}
          </SortableContext>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(e.target.value.length > 0);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => inputValue && setShowSuggestions(true)}
            placeholder={tags.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm text-gray-900 placeholder-gray-500"
          />
          {inputValue.trim() && (
            <button
              type="button"
              onClick={() => addTag()}
              title="Crear etiqueta"
              className="p-1 rounded hover:bg-white/40 transition-colors cursor-pointer"
            >
              <FiPlus className="w-4 h-4 text-gray-700" />
            </button>
          )}
        </div>
      </DndContext>

      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 backdrop-blur-xl bg-white/60 rounded-lg shadow-2xl border border-white/30 max-h-48 overflow-y-auto"
        >
          {filteredSuggestions.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => addTag(tag)}
              className="w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-white/40 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: tag.color ?? '#2563EB' }}
              />
              {tag.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

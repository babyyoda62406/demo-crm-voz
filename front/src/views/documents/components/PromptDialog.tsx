import { useState } from 'react';
import { Modal } from '../../../components/Modal';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';

interface PromptDialogProps {
  isOpen: boolean;
  titulo: string;
  etiqueta: string;
  valorInicial?: string;
  /**
   * Extensión del documento, con punto. Se muestra fija junto al campo y se
   * vuelve a pegar al nombre al guardar, así que no se puede perder ni cambiar.
   */
  extensionFija?: string;
  textoConfirmar?: string;
  cargando?: boolean;
  onConfirmar: (valor: string) => void;
  onCerrar: () => void;
}

/**
 * Diálogo de una sola línea de texto: crear carpeta y renombrar elementos.
 * Confirma con Enter, que es como se renombra en cualquier gestor de archivos.
 *
 * Al renombrar un documento se edita solo el nombre y la extensión queda a la
 * vista pero fuera del campo, como en Windows o en Google Drive: escribirla mal
 * (o no escribirla) dejaba el documento sin visor y sin editor.
 */
export const PromptDialog = ({
  isOpen,
  titulo,
  etiqueta,
  valorInicial = '',
  extensionFija = '',
  textoConfirmar = 'Guardar',
  cargando = false,
  onConfirmar,
  onCerrar,
}: PromptDialogProps) => {
  const [valor, setValor] = useState(valorInicial);
  const [abiertoAntes, setAbiertoAntes] = useState(isOpen);

  // Reajuste durante el render (no en un efecto): al abrirse, el campo parte
  // del valor actual del elemento. El diálogo se reutiliza para crear carpeta y
  // para renombrar, así que no puede arrastrar lo que se escribió la vez previa.
  if (isOpen !== abiertoAntes) {
    setAbiertoAntes(isOpen);
    if (isOpen) setValor(valorInicial);
  }

  const confirmar = () => {
    const limpio = valor.trim();
    if (!limpio) return;
    onConfirmar(`${limpio}${extensionFija}`);
  };

  return (
    <Modal isOpen={isOpen} onClose={onCerrar} title={titulo} size="sm">
      <div className="space-y-5">
        <div className="flex items-end gap-2">
          <Input
            label={etiqueta}
            value={valor}
            autoFocus
            onChange={(evento) => setValor(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter') confirmar();
            }}
            placeholder="Escribe un nombre"
          />

          {extensionFija && (
            <span className="flex-shrink-0 select-none rounded-xl border border-gray-300 backdrop-blur-md bg-white/30 px-3 py-3 text-base font-semibold text-gray-700 shadow-sm">
              {extensionFija}
            </span>
          )}
        </div>

        {extensionFija && (
          <p className="-mt-3 text-sm text-gray-600">
            La extensión «{extensionFija}» se conserva: es la que permite abrir el documento
            dentro del CRM.
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCerrar} disabled={cargando}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={confirmar} isLoading={cargando} disabled={!valor.trim()}>
            {textoConfirmar}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

import { forwardRef, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle } from 'react-icons/fi';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const isEmail = type === 'email';
    const inputType = isPassword && showPassword ? 'text' : type;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-base font-semibold text-gray-900 mb-2">{label}</label>
        )}
        <div className="relative">
          {(isEmail || isPassword) && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
              {isEmail && <FiMail className="w-5 h-5 text-gray-600" />}
              {isPassword && <FiLock className="w-5 h-5 text-gray-600" />}
            </div>
          )}
          <input
            ref={ref}
            type={inputType}
            className={`
              w-full border rounded-xl
              backdrop-blur-md bg-white/50 text-gray-900 placeholder-gray-500 text-base
              transition-all duration-200 ease-in-out
              focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500
              hover:border-gray-400
              ${error ? 'border-red-500 focus:ring-red-500/50 focus:border-red-500' : 'border-gray-300'}
              shadow-sm hover:shadow-md focus:shadow-lg
              ${isEmail || isPassword ? 'pl-11 pr-4' : 'px-4'}
              ${isPassword ? 'pr-11' : ''}
              py-3
              ${className}
            `}
            style={{
              WebkitTextFillColor: 'rgb(17, 24, 39)',
              WebkitBoxShadow: '0 0 0px 1000px rgba(255, 255, 255, 0.5) inset',
            }}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-1 top-1/2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-lg text-gray-600 hover:text-gray-800 transition-colors focus:outline-none focus:text-gray-800 cursor-pointer select-none z-10"
              tabIndex={-1}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
            </button>
          )}
        </div>
        {error && (
          <p className="mt-2 text-base text-red-600 font-medium flex items-center gap-1">
            <FiAlertCircle className="w-5 h-5" />
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

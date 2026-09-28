export interface LoginFormData {
  email: string;
  password: string;
}

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => password.length >= 6;

export const validateLoginForm = (
  data: LoginFormData,
): { isValid: boolean; errors: Partial<LoginFormData> } => {
  const errors: Partial<LoginFormData> = {};

  if (!data.email || !validateEmail(data.email)) {
    errors.email = 'Correo electrónico inválido';
  }

  if (!data.password || !validatePassword(data.password)) {
    errors.password = 'La contraseña debe tener al menos 6 caracteres';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};

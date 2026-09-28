import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLogin } from '../../hooks/useLogin';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { Logo } from '../../components/Logo';
import { validateLoginForm } from '../../validations/auth.validations';
import { APP_CONFIG } from '../../config/global';

export const LoginView = () => {
  const { t } = useTranslation('login');
  const { login, isLoading } = useLogin();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateLoginForm(formData);

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    void login(formData);
  };

  return (
    <div className="auth-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="backdrop-blur-xl bg-white/25 rounded-2xl shadow-2xl p-8 border border-white/30">
          <div className="flex items-center gap-4 mb-8">
            <Logo className="w-14 h-14" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 drop-shadow-sm">
                {APP_CONFIG.APP_NAME}
              </h1>
              <p className="text-sm font-medium text-gray-700">{APP_CONFIG.APP_SUBTITLE}</p>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-1">{t('login.title')}</h2>
          <p className="text-sm text-gray-700 mb-6">{t('login.subtitle')}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t('login.email')}
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              required
              autoComplete="email"
              placeholder="tu@example.com"
            />

            <Input
              label={t('login.password')}
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />

            <Button type="submit" variant="primary" isLoading={isLoading} className="w-full py-3">
              {t('login.submit')}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-gray-600 select-none">
          {APP_CONFIG.APP_NAME} · {t('login.footer')}
        </p>
      </div>
    </div>
  );
};

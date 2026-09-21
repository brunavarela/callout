import { useEffect } from 'react';
import { Check } from 'lucide-react';
import { SnakeSpinner } from './Spinner';

// Botão de salvar que se transforma em vez de abrir um "Salvo." separado do
// lado (pedido de 21/09/2026) -- salvando, mostra um spinner ao lado do
// texto; ao suceder, o próprio botão fica com o fundo na cor positiva
// (var(--pos), a mesma que o usuário escolhe em Configurações de tema),
// troca o texto pro rótulo de sucesso e ganha um check à direita, por
// alguns segundos, antes de voltar ao normal sozinho.
export function SaveButton({
  onClick,
  saving,
  success,
  onSuccessTimeout,
  label,
  savingLabel = 'Salvando',
  successLabel = 'Salvo',
  disabled,
  style,
}: {
  onClick: () => void;
  saving: boolean;
  success: boolean;
  // Chamado depois de alguns segundos com success=true, pra quem chama
  // resetar o próprio estado (o componente não guarda o "success" sozinho,
  // só decide quando parar de mostrar).
  onSuccessTimeout: () => void;
  label: string;
  savingLabel?: string;
  successLabel?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  useEffect(() => {
    if (!success) return;
    const timeout = setTimeout(onSuccessTimeout, 2200);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [success]);

  return (
    <button
      className="btn-secondary"
      onClick={onClick}
      disabled={disabled || saving}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        transition: 'background .2s ease, border-color .2s ease, color .2s ease',
        ...(success
          ? { background: 'var(--pos, #18AAB7)', borderColor: 'var(--pos, #18AAB7)', color: '#fff' }
          : {}),
        ...style,
      }}
    >
      {saving ? (
        <>
          {savingLabel}
          <SnakeSpinner size={14} color="currentColor" />
        </>
      ) : success ? (
        <>
          {successLabel}
          <Check size={14} strokeWidth={2.5} />
        </>
      ) : (
        label
      )}
    </button>
  );
}

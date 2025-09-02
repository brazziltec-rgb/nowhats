/*
  # Adicionar Relação de Canal aos Tickets
  Adiciona a coluna `channel_id` à tabela `tickets` para vincular cada atendimento ao canal de origem.

  ## Descrição da Query:
  Esta operação adiciona uma chave estrangeira (`channel_id`) na tabela `tickets`, referenciando a tabela `channels`. Isso é fundamental para saber de qual conexão do WhatsApp (canal) um ticket se originou, permitindo que as respostas sejam enviadas pelo canal correto. A operação é segura e não afeta dados existentes, mas a coluna será `NULL` para tickets antigos.

  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "Low"
  - Requires-Backup: false
  - Reversible: true (DROP COLUMN e DROP CONSTRAINT)

  ## Detalhes da Estrutura:
  - Tabela Afetada: `tickets`
  - Coluna Adicionada: `channel_id` (UUID)
  - Constraint Adicionada: `tickets_channel_id_fkey` (FOREIGN KEY)

  ## Implicações de Segurança:
  - RLS Status: Habilitado
  - Policy Changes: Não
  - Auth Requirements: A política de RLS existente na tabela `tickets` (baseada em `user_id`) cobrirá implicitamente esta nova coluna.

  ## Impacto de Performance:
  - Indexes: Uma chave estrangeira cria um índice automaticamente, o que pode melhorar a performance de buscas que filtram por `channel_id`.
  - Triggers: Nenhum
  - Estimated Impact: Baixo. A escrita de novos tickets terá um custo marginalmente maior devido à verificação da chave estrangeira.
*/
ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS channel_id UUID;

-- Adiciona a constraint de chave estrangeira apenas se ela não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tickets_channel_id_fkey'
  ) THEN
    ALTER TABLE public.tickets
    ADD CONSTRAINT tickets_channel_id_fkey
    FOREIGN KEY (channel_id)
    REFERENCES public.channels(id)
    ON DELETE SET NULL;
  END IF;
END;
$$;

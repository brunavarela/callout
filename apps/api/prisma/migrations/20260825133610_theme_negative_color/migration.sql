-- Cor "positiva" vira cor "negativa": o sentido da segunda cor do tema
-- inverteu (agora é só pra derrota/valores negativos; a cor principal
-- passa a colorir também vitória/valores positivos). Não dá pra
-- aproveitar o valor antigo — quem tinha customizado "positiva" ficaria
-- com uma cor errada em "negativa" (ex.: perdas ficariam verdes).
ALTER TABLE "users" ADD COLUMN "themeNegative" TEXT NOT NULL DEFAULT '#EF4958';
ALTER TABLE "users" DROP COLUMN "themePositive";

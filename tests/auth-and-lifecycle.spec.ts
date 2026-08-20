import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, email: string, password = "demo1234") {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

test("admin entra na lista de campanhas", async ({ page }) => {
  await login(page, "admin@demo.com");
  await expect(page).toHaveURL(/\/campaigns/);
  await expect(page.getByRole("heading", { name: "Campanhas" })).toBeVisible();
});

test("admin acessa cadastro de usuários", async ({ page }) => {
  await login(page, "admin@demo.com");
  await page.getByRole("link", { name: "Usuários" }).click();
  await expect(page).toHaveURL(/\/users/);
  await expect(page.getByRole("heading", { name: "Usuários" })).toBeVisible();
  await expect(page.getByText("ana@demo.com")).toBeVisible();
});

test("vendedor entra no portal de vendas", async ({ page }) => {
  await login(page, "vendedor@demo.com");
  await expect(page).toHaveURL(/\/sales/);
  await expect(page.getByRole("heading", { name: "Vendas" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Campanhas" })).toHaveCount(0);
});

test("campanha em rascunho bloqueia a operação", async ({ page }) => {
  const name = `Rascunho ${Date.now()}`;
  await login(page, "admin@demo.com");
  await expect(page.getByRole("heading", { name: "Campanhas" })).toBeVisible();
  await page.getByRole("button", { name: "Nova campanha" }).click();
  await page.getByLabel("Nome").fill(name);
  await page.getByRole("button", { name: "Criar campanha" }).click();
  await expect(page.getByRole("link").filter({ hasText: name })).toBeVisible();
  await page.getByRole("link").filter({ hasText: name }).click();
  await expect(page.getByText("Dados da campanha")).toBeVisible();
  await page.getByRole("link", { name: "Operação" }).click();
  await expect(page.getByText("Fila indisponível")).toBeVisible();
  await expect(page.getByText(/ainda está em rascunho/i)).toBeVisible();
});

test("agente sem campanha vê lista vazia", async ({ page }) => {
  await login(page, "ana@demo.com");
  await expect(page.getByRole("heading", { name: "Campanhas" })).toBeVisible();
  await expect(page.getByText("Você ainda não foi adicionada a nenhuma campanha")).toBeVisible();
});

test("admin acessa cadastro de clientes", async ({ page }) => {
  await login(page, "admin@demo.com");
  await page.getByRole("link", { name: "Clientes" }).click();
  await expect(page).toHaveURL(/\/customers/);
  await expect(page.getByRole("heading", { name: "Clientes" })).toBeVisible();
});

test("supervisor vê a caixa Precisa de ação e o ranking após ativar campanha", async ({ page }) => {
  const name = `Fila ${Date.now()}`;
  await login(page, "admin@demo.com");
  await page.getByRole("button", { name: "Nova campanha" }).click();
  await page.getByLabel("Nome").fill(name);
  await page.getByRole("button", { name: "Criar campanha" }).click();
  await page.getByRole("link").filter({ hasText: name }).click();
  await expect(page.getByText("Dados da campanha")).toBeVisible();

  await page.getByRole("combobox").filter({ hasText: "Selecione uma agente" }).click();
  await page.getByRole("option", { name: "Ana" }).click();
  await page.getByRole("button", { name: "Adicionar" }).first().click();
  await expect(page.getByText("ana@demo.com")).toBeVisible();

  await page.getByRole("combobox").filter({ hasText: "Rascunho" }).click();
  await page.getByRole("option", { name: "Ativa" }).click();
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText("Campanha atualizada.")).toBeVisible();

  await page.getByRole("link", { name: "Contatos" }).click();
  await expect(page.getByRole("tab", { name: /Precisa de ação/ })).toBeVisible();
  await expect(
    page.getByText(/Nenhum lead precisa de ação agora|Selecione leads indefinidos/)
  ).toBeVisible();

  const rankingHref = await page.getByRole("link", { name: "Ranking" }).getAttribute("href");
  await page.goto(rankingHref!);
  await expect(page).toHaveURL(/\/ranking/);
  await expect(page.getByText("Ranking ao vivo")).toBeVisible();
  await expect(page.getByText(/Horário de Cuiabá/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Espelhar na TV" })).toBeVisible();
  await expect(page.getByText("Ligações hoje")).toBeVisible();
  await expect(page.getByText("Pontos hoje")).toBeVisible();
});

test("pedido de redefinição de senha é público", async ({ page }) => {
  await page.goto("/forgot-password");
  await expect(page.getByRole("heading", { name: "Redefinir senha" })).toBeVisible();
  await page.getByLabel("E-mail").fill("ana@demo.com");
  await page.getByRole("button", { name: "Enviar link" }).click();
  await expect(page.getByText(/se o e-mail existir/i)).toBeVisible();
});

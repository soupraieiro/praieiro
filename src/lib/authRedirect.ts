/**
 * Preserva o destino pós-login (ex.: tela de consentimento OAuth /.lovable/oauth/consent).
 * Aceita apenas caminhos relativos de mesma origem.
 */
const KEY = "praieiro_post_auth_redirect";

export function isSafeRelativePath(path: string | null | undefined): path is string {
  if (!path) return false;
  return path.startsWith("/") && !path.startsWith("//");
}

export function rememberPostAuthRedirect(path: string | null | undefined) {
  if (isSafeRelativePath(path)) sessionStorage.setItem(KEY, path);
}

export function peekPostAuthRedirect(): string | null {
  const value = sessionStorage.getItem(KEY);
  return isSafeRelativePath(value) ? value : null;
}

export function takePostAuthRedirect(): string | null {
  const value = peekPostAuthRedirect();
  sessionStorage.removeItem(KEY);
  return value;
}

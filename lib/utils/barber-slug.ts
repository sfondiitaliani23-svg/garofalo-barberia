/** "Luigi Garofalo" -> "luigi-garofalo" */
export function barberSlug(name: string) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

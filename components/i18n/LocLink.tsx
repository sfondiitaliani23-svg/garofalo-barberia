'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { localHref } from '@/lib/i18n';
import { useLang } from './LangProvider';

type Props = Omit<ComponentProps<typeof Link>, 'href'> & { href: string };

/** Come <Link>, ma in inglese aggiunge /en agli indirizzi interni. Si usa al posto di next/link. */
export function LocLink({ href, ...rest }: Props) {
  const lang = useLang();
  return <Link href={localHref(lang, href)} {...rest} />;
}

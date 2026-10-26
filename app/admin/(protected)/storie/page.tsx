import { AdminStories } from '@/components/admin/AdminStories';
import { listStoriesAction } from '@/lib/actions/stories';
import { getProfile } from '@/lib/auth';

export const metadata = { title: 'Storie' };
export const dynamic = 'force-dynamic';

export default async function AdminStoriePage() {
  const [res, me] = await Promise.all([listStoriesAction(), getProfile()]);
  return (
    <div>
      <h1 className="font-display text-3xl uppercase text-white">Storie</h1>
      <p className="mt-1 text-sm text-white/50">
        Foto, video, promo e numeri che i clienti vedono nel cerchio dorato in home, come le storie di Instagram. Scegli il giorno, carica e metti in ordine.
      </p>
      <div className="mt-6">
        {res.ok ? (
          <AdminStories initial={res.stories} today={res.today} tester={me?.role === 'tester'} />
        ) : (
          <p className="border border-dashed border-gold/40 p-4 text-sm text-white/80">{res.error}</p>
        )}
      </div>
    </div>
  );
}

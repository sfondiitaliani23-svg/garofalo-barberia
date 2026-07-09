import { getAdminProducts } from '@/lib/actions/admin';
import { AdminProductsManager } from '@/components/admin/AdminProductsManager';

export const metadata = { title: 'Inventario Admin' };

export default async function AdminInventarioPage() {
  const products = await getAdminProducts();

  return (
    <div>
      <h1 className="font-display text-3xl uppercase">Inventario prodotti</h1>
      <p className="mt-1 text-white/50">Profumi Mood e prodotti in negozio</p>
      <div className="mt-8">
        <AdminProductsManager products={products} />
      </div>
    </div>
  );
}
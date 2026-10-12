import { getAdminProducts } from '@/lib/actions/admin';
import { AdminProductsManager } from '@/components/admin/AdminProductsManager';

export const metadata = { title: 'Inventario Admin' };

export default async function AdminInventarioPage() {
  const products = await getAdminProducts();

  return (
    <div>
      <AdminProductsManager products={products} />
    </div>
  );
}
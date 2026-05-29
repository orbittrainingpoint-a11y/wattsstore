'use client';

import { AdminListPage } from '@/components/admin/AdminListPage';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

interface Customer {
  id: number; email: string; firstName: string; lastName: string;
  isActive: boolean; createdAt: string; _count: { orders: number };
}

export default function AdminCustomers() {
  return (
    <AdminListPage<Customer>
      eyebrow="Sales"
      title="Customers"
      endpoint="/admin/customers"
      rowKey={(c) => c.id}
      empty={{ icon: '👥', title: 'No customers yet', sub: 'Registrations will appear here.' }}
      columns={[
        { label: 'Name', render: (c) => (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-blue to-[#4cc9f0] text-white text-xs font-bold flex items-center justify-center">{c.firstName.charAt(0)}{c.lastName.charAt(0)}</div>
            <div><div className="font-semibold">{c.firstName} {c.lastName}</div><div className="text-xs text-brand-gray">{c.email}</div></div>
          </div>
        ) },
        { label: 'Orders', render: (c) => <span className="badge-blue">{c._count.orders}</span> },
        { label: 'Joined', render: (c) => <span className="text-xs">{formatDate(c.createdAt)}</span> },
        { label: 'Status', render: (c) => <span className={`badge ${c.isActive ? 'badge-success' : 'badge-error'}`}>{c.isActive ? 'Active' : 'Banned'}</span> },
        { label: '', render: (c) => <Link href={`/admin/customers/${c.id}`} className="text-brand-blue text-xs font-semibold hover:underline">View -&gt;</Link> },
      ]}
    />
  );
}

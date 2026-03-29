'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function DeleteButton({ date }: { date: string }) {
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(`Delete challenge for ${date}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dates: [date], status: 'archived' }),
      });
      if (res.ok) router.push('/challenges/review');
    } catch {} finally { setDeleting(false); }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="bg-red-50 text-red-600 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-red-100 disabled:opacity-50"
    >
      {deleting ? 'Deleting...' : 'Delete'}
    </button>
  );
}

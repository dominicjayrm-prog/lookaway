import { BlinkMini } from '@/components/BlinkMini';

export default function SettingsPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-2">
        <BlinkMini size={48} />
        <div>
          <h1 className="text-3xl font-bold text-brand-text">Settings</h1>
          <p className="text-sm text-brand-textMid">App configuration</p>
        </div>
      </div>

      <div className="mt-8 bg-brand-card rounded-brand shadow-brand-card p-6 border border-brand-border">
        <p className="text-sm text-brand-textMid">
          Configuration options will be added here as the app grows.
        </p>
      </div>
    </div>
  );
}

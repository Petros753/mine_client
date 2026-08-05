interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
}

export function MetricCard({ title, value, description }: MetricCardProps) {
  return (
    <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow dark:bg-zinc-900 sm:p-6">
      <dt className="truncate text-sm font-medium text-zinc-500 dark:text-zinc-400">
        {title}
      </dt>
      <dd className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {value}
      </dd>
      {description && (
        <dd className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {description}
        </dd>
      )}
    </div>
  );
}

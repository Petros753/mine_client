import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
}

export function MetricCard({ title, value, description }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="text-xs font-medium uppercase tracking-wide">
          {title}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CardTitle className="text-3xl font-semibold tracking-tight">
          {value}
        </CardTitle>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

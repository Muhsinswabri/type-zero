import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from '../components/ui/ui';

export default function NotFoundPage() {
  return (
    <EmptyState
      icon={<Compass size={36} />}
      title="Page not found"
      action={
        <Link to="/" className="btn btn-primary">
          Back to dashboard
        </Link>
      }
    >
      The page you were looking for does not exist. Your progress is safe.
    </EmptyState>
  );
}

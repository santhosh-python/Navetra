import { Link } from "react-router-dom";
import { PageScaffold } from "../components/layout/PageScaffold";

export function NotFoundPage() {
  return (
    <PageScaffold title="Page not found" description="That Navetra route does not exist.">
      <p>
        <Link className="text-link" to="/">
          Return to overview
        </Link>
      </p>
    </PageScaffold>
  );
}

/**
 * Screen: page not found.
 *
 * Shown when a web address does not match any screen, with a way back to the
 * dashboard.
 */
import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-full items-center justify-center bg-muted p-6">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline ">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;

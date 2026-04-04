import { Navigation } from "./Navigation";

export function Layout({ children }) {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>{children}</main>
    </div>
  );
}

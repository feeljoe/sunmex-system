import "../globals.css";

export default function AuthLayout({children}: {children: React.ReactNode }) {
  return (
          <main className="w-full h-full bg-gray-100">{children}</main>
  );
}

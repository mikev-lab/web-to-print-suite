import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t">
      <div className="container flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            © 2025 MCE Printing. All rights reserved.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/">Home</Link>
          <Link href="/build">Build</Link>
          <Link href="/faq">Help</Link>
        </div>
      </div>
    </footer>
  );
}

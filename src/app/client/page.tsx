import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Bell, CloudIcon, ShirtIcon, User } from "lucide-react";

const StoreIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
    <path d="M2 7h20" />
    <path d="M22 7v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7" />
  </svg>
);

const CalendarClockIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5" />
    <path d="M16 2v4" />
    <path d="M8 2v4" />
    <path d="M3 10h18" />
    <path d="M17.5 17.5 16 16.25V14" />
    <path d="M22 16a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z" />
  </svg>
);

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 4s-.7 2.1-2 3.4c1.6 1.4 3.3 4.4 3.3 4.4s-1.4 1.4-2.8 2.1c-1.1 1.1-2.2 2.3-3.8 3.2s-3.6 1.6-5.4 1.6c-1.8 0-3.6-.6-5.4-1.6s-3-2.1-3.8-3.2c-1.4-.7-2.8-2.1-2.8-2.1s1.7-3 3.3-4.4C4.7 6.1 4 4 4 4s1.1.7 2.2 1.4c1.1.7 2.2 1.1 3.3 1.1s2.2-.4 3.3-1.1c1.1-.7 2.2-1.4 2.2-1.4" />
  </svg>
);

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const AnimatedBubbles = () => (
    <div className="bubbles">
      {Array.from({ length: 15 }).map((_, i) => {
        // Simple hash function for more variance
        const hash = (i * 2654435761) % 4294967296;
        const randomX = (hash % 80) + 10; // 10% to 90%
        const randomDelay = -((hash % 200) / 10); // 0s to -20s
        const randomDuration = 15 + (hash % 15); // 15s to 30s
        
        return (
          <span
            key={i}
            style={
              {
                '--i': 11 + (i % 15),
                left: `${randomX}%`,
                animationDelay: `${randomDelay}s`,
                animationDuration: `${randomDuration}s`,
                width: `${20 + (hash % 15)}px`,
                height: `${20 + (hash % 15)}px`
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
);


export default function ClientDashboard() {
  return (
    <div className="flex min-h-screen flex-col bg-white font-body">
      <header className="sticky top-0 z-50 w-full bg-white/80 shadow-sm backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="#" className="font-headline text-lg font-bold text-gray-800">
            Lavandería y Planchaduría Angy
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/client/schedule"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-primary"
            >
              Programar servicio
            </Link>
            <Link
              href="#"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-primary"
            >
              Historial de pedidos
            </Link>
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5 text-gray-600" />
              <span className="sr-only">Notificaciones</span>
            </Button>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-gray-600" />
              <span className="text-sm text-gray-600">user@gmail.com</span>
            </div>
          </nav>
          <Button variant="ghost" size="icon" className="md:hidden">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>
      </header>
      <main className="flex-1">
        <section className="relative flex h-[50vh] items-center justify-center bg-gradient-to-br from-cyan-500 via-sky-500 to-blue-600 text-center overflow-hidden rounded-b-[50px] shadow-lg">
          <AnimatedBubbles />
          {/* Decoración similar a otras vistas */}
          <div className="absolute top-10 left-10 w-24 h-24 bg-white/10 rounded-full blur-xl animate-pulse" />
          <div className="absolute top-20 right-20 w-32 h-32 bg-cyan-200/20 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 left-1/3 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10 space-y-4 px-4">
            <h1 className="font-headline text-4xl font-bold text-white md:text-6xl drop-shadow">
              LAVANDERIA Y PLANCHADURIA ANGY
            </h1>
            <p className="text-lg text-white/90 md:text-xl">
              Honradez y Eficacia
            </p>
            <Button
              asChild
              size="lg"
              className="mt-4 bg-cyan-600 hover:bg-cyan-700 text-white shadow-md shadow-cyan-200 rounded-xl"
            >
              <Link href="/client/schedule">Programar servicio</Link>
            </Button>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16 md:px-6 md:py-24">
          <h2 className="mb-12 text-center font-headline text-3xl font-bold text-gray-800">
            Mis funciones
          </h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <Link href="/client/schedule">
              <div className="group flex items-center justify-between rounded-lg bg-cyan-50/50 p-8 transition-shadow hover:shadow-lg">
                <div>
                  <h3 className="font-headline text-2xl font-semibold text-gray-700">
                    Programar servicio
                  </h3>
                </div>
                <StoreIcon className="h-20 w-20 text-blue-400 transition-transform group-hover:scale-110" />
              </div>
            </Link>
            <Link href="#">
              <div className="group flex items-center justify-between rounded-lg bg-cyan-50/50 p-8 transition-shadow hover:shadow-lg">
                <div>
                  <h3 className="font-headline text-2xl font-semibold text-gray-700">
                    Mi Ropa
                  </h3>
                </div>
                <ShirtIcon className="h-20 w-20 text-blue-400 transition-transform group-hover:scale-110" /> 
              </div>
            </Link>
            <Link href="#">
              <div className="group flex items-center justify-between rounded-lg bg-cyan-50/50 p-8 transition-shadow hover:shadow-lg">
                <div>
                  <h3 className="font-headline text-2xl font-semibold text-gray-700">
                    Historial
                  </h3>
                </div>
                <CalendarClockIcon className="h-20 w-20 text-blue-400 transition-transform group-hover:scale-110" />
              </div>
            </Link>
            
          </div>
        </section>
      </main>

      <footer className="bg-gray-100 py-6">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row md:px-6">
          <p className="text-sm text-gray-500">
            © 2025 José Fernando Garcia Quintero
          </p>
          <div className="flex items-center gap-6">
             <div className="flex gap-4">
              <Link href="#" className="text-gray-500 hover:text-primary">
                <FacebookIcon className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-gray-500 hover:text-primary">
                <TwitterIcon className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-gray-500 hover:text-primary">
                <InstagramIcon className="h-5 w-5" />
              </Link>
            </div>
             <div className="flex gap-4 text-sm">
                 <Link href="#" className="text-gray-500 hover:text-primary">
                    Blog
                </Link>
                <Link href="#" className="text-gray-500 hover:text-primary">
                    Support
                </Link>
                <Link href="#" className="text-gray-500 hover:text-primary">
                    Developers
                </Link>
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

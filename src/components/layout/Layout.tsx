import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';

export function Layout() {
    return (
        <div className="flex flex-col h-full bg-white">
            <main className="flex-1 overflow-y-auto pb-[calc(88px+env(safe-area-inset-bottom,0px))] md:pb-24">
                <Outlet />
            </main>
            <BottomNav />
        </div>
    );
}

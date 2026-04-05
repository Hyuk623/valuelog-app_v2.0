import { NavLink } from 'react-router-dom';
import { Home, BookOpen, BarChart2, Award, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
    { to: '/', icon: Home, label: '홈', end: true },
    { to: '/timeline', icon: BookOpen, label: '기록' },
    { to: '/stats', icon: BarChart2, label: '통계' },
    { to: '/badges', icon: Award, label: '배지' },
    { to: '/settings', icon: Settings, label: '설정' },
];

export function BottomNav() {
    return (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-surface border-t border-border safe-bottom z-50 transition-colors duration-300">
            <div className="flex items-center justify-around py-2">
                {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={end}
                        className={({ isActive }) =>
                            cn(
                                'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200',
                                isActive
                                    ? 'text-brand-600'
                                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-200'
                            )
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <span className={cn('transition-transform duration-200', isActive && 'scale-110')}>
                                    <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                </span>
                                <span className={cn('text-xs font-medium', isActive ? 'font-semibold' : '')}>
                                    {label}
                                </span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}

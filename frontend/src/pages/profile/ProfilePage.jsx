import { useAuth } from '../../store/AuthContext';
import { HiOutlineEnvelope, HiOutlineUser, HiOutlineShieldCheck, HiOutlineCalendar } from 'react-icons/hi2';

export default function ProfilePage() {
    const { user } = useAuth();

    if (!user) return null;

    const fields = [
        { icon: HiOutlineUser, label: 'Full Name', value: user.full_name },
        { icon: HiOutlineEnvelope, label: 'Email', value: user.email },
        { icon: HiOutlineUser, label: 'Username', value: user.username },
        { icon: HiOutlineShieldCheck, label: 'Role', value: user.role },
        { icon: HiOutlineCalendar, label: 'Member Since', value: new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
    ];

    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-6">My Profile</h1>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden max-w-2xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-8">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                            <span className="text-2xl font-bold text-white">{user.full_name?.charAt(0)?.toUpperCase()}</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">{user.full_name}</h2>
                            <p className="text-primary-200 text-sm capitalize">{user.role}</p>
                        </div>
                    </div>
                </div>
                {/* Fields */}
                <div className="divide-y divide-slate-100">
                    {fields.map((f) => (
                        <div key={f.label} className="px-6 py-4 flex items-center gap-4">
                            <div className="p-2 bg-slate-50 rounded-lg">
                                <f.icon className="w-5 h-5 text-slate-400" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-medium">{f.label}</p>
                                <p className="text-sm text-slate-700 font-medium capitalize">{f.value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
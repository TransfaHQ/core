import { LoginForm } from "@/components/login-form";

export function Login() {
    return (<div className="h-screen w-screen bg-white flex items-center justify-center">
        <LoginForm className="w-full max-w-sm" />
    </div>)
}
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { LogIn, UserPlus, Mail, Lock, User, Building2 } from 'lucide-react';
import { toast } from 'sonner';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_broker-crm-uk/artifacts/fwvsstux_LOOGOO.png';
const BG_IMAGE = 'https://images.unsplash.com/photo-1673551799304-b81cce68c308?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA2MjJ8MHwxfHNlYXJjaHw0fHxtb2Rlcm4lMjBvZmZpY2UlMjBhcmNoaXRlY3R1cmUlMjBza3lzY3JhcGVyfGVufDB8fHx8MTc3MjU0MDk0OHww&ixlib=rb-4.1.0&q=85';

const Login = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register form state
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerRole, setRegisterRole] = useState('advisor');

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(loginEmail, loginPassword);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await register(registerEmail, registerPassword, registerName, registerRole);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md animate-fadeIn">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img 
              src={LOGO_URL} 
              alt="KK Mortgage Solutions" 
              className="h-20 object-contain"
              data-testid="login-logo"
            />
          </div>

          <Card className="border-0 shadow-none">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-bold text-slate-900">
                Welcome
              </CardTitle>
              <CardDescription className="text-slate-500">
                Sign in to access your CRM dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login" data-testid="login-tab">Sign In</TabsTrigger>
                  <TabsTrigger value="register" data-testid="register-tab">Create Account</TabsTrigger>
                </TabsList>

                {/* Login Tab */}
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="name@company.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="pl-10"
                          required
                          data-testid="login-email-input"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="Enter your password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="pl-10"
                          required
                          data-testid="login-password-input"
                        />
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-red-600 hover:bg-red-700"
                      disabled={isLoading}
                      data-testid="login-submit-btn"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                          Signing in...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <LogIn className="h-4 w-4" />
                          Sign In
                        </span>
                      )}
                    </Button>
                  </form>
                </TabsContent>

                {/* Register Tab */}
                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-name">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="register-name"
                          type="text"
                          placeholder="John Smith"
                          value={registerName}
                          onChange={(e) => setRegisterName(e.target.value)}
                          className="pl-10"
                          required
                          data-testid="register-name-input"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="register-email"
                          type="email"
                          placeholder="name@company.com"
                          value={registerEmail}
                          onChange={(e) => setRegisterEmail(e.target.value)}
                          className="pl-10"
                          required
                          data-testid="register-email-input"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="register-password"
                          type="password"
                          placeholder="Create a password"
                          value={registerPassword}
                          onChange={(e) => setRegisterPassword(e.target.value)}
                          className="pl-10"
                          required
                          minLength={6}
                          data-testid="register-password-input"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-role">Role</Label>
                      <Select value={registerRole} onValueChange={setRegisterRole}>
                        <SelectTrigger data-testid="register-role-select">
                          <Building2 className="h-4 w-4 mr-2 text-slate-400" />
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="advisor">Advisor</SelectItem>
                          <SelectItem value="admin_staff">Admin Staff</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-red-600 hover:bg-red-700"
                      disabled={isLoading}
                      data-testid="register-submit-btn"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                          Creating account...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <UserPlus className="h-4 w-4" />
                          Create Account
                        </span>
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-slate-500 mt-6">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>

      {/* Right Panel - Image */}
      <div 
        className="hidden lg:block lg:w-1/2 relative bg-cover bg-center"
        style={{ backgroundImage: `url(${BG_IMAGE})` }}
      >
        <div className="absolute inset-0 bg-slate-900/60" />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-center text-white max-w-lg">
            <h2 className="text-4xl font-bold mb-4" style={{ fontFamily: 'Plus Jakarta Sans' }}>
              Streamline Your Mortgage Business
            </h2>
            <p className="text-lg text-slate-200">
              Manage leads, track cases, forecast revenue, and grow your brokerage with our comprehensive CRM solution.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

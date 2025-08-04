import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { supabase } from "@/lib/supabaseClient";
import * as XLSX from "xlsx";

export default function HOAAdminPortal() {
  const [user, setUser] = useState(null);
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [extraFee, setExtraFee] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserRole, setNewUserRole] = useState("member");

  useEffect(() => {
    const getSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getSession();
  }, []);

  useEffect(() => {
    if (user) {
      checkIfAdmin();
      fetchMembers();
    }
  }, [user]);

  useEffect(() => {
    if (selectedMember) fetchPaymentHistory();
  }, [selectedMember]);

  const checkIfAdmin = async () => {
    const { data } = await supabase.from("admins").select("email").eq("email", user.email);
    if (data && data.length > 0) setIsAdmin(true);
  };

  const fetchMembers = async () => {
    const { data, error } = await supabase.from("members").select("*");
    if (!error) {
      setMembers(data);
      setSelectedMember(data[0]);
    }
  };

  const fetchPaymentHistory = async () => {
    const { data, error } = await supabase
      .from("payments")
      .select("amount, paid_at")
      .eq("member_id", selectedMember.id)
      .order("paid_at", { ascending: false });
    if (!error) setPaymentHistory(data);
  };

  const handleUpdate = async (field, value) => {
    if (!selectedMember || !isAdmin) return;
    const updated = { ...selectedMember, [field]: Number(value) };
    await supabase.from("members").update(updated).eq("id", selectedMember.id);
    fetchMembers();
  };

  const handleAddPayment = async () => {
    if (!selectedMember || !isAdmin || paymentAmount <= 0) return;
    const newBalance = selectedMember.balance - paymentAmount;
    await supabase.from("payments").insert({
      member_id: selectedMember.id,
      amount: paymentAmount,
      paid_at: new Date().toISOString(),
    });
    await supabase.from("members").update({ balance: newBalance }).eq("id", selectedMember.id);
    fetchMembers();
    fetchPaymentHistory();
    setPaymentAmount(0);
  };

  const exportToExcel = () => {
    const data = members.map((m) => ({
      Name: m.name,
      Balance: m.balance,
      WaterBill: m.waterBill,
      SecurityFee: m.securityFee,
      Operations: m.operations,
      ExtraFees: m.extraFees || 0,
      MonthlyTotal: computeMonthlyBalance(m),
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Members");
    XLSX.writeFile(workbook, "HOA_Members.xlsx");
  };

  const computeMonthlyBalance = (member) => {
    return member.waterBill + member.securityFee + member.operations + (member.extraFees || 0);
  };

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setAuthError("Login failed: " + error.message);
    } else {
      setUser(data.user);
      setAuthError("");
    }
  };

  const handleCreateUser = async () => {
    const { data, error } = await supabase.auth.admin.createUser({
      email: newUserEmail,
      password: newUserPassword,
      email_confirm: true,
    });
    if (error) alert("Error creating user: " + error.message);
    else {
      await supabase.from("members").insert({ email: newUserEmail, name: newUserName, balance: 0 });
      if (newUserRole === "admin") {
        await supabase.from("admins").insert({ email: newUserEmail });
      }
      alert("User created successfully!");
    }
  };

  if (!user) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <h1 className="text-xl font-bold mb-4">Login to HOA Portal</h1>
        <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="mb-2" />
        <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="mb-2" />
        <Button onClick={handleLogin}>Login</Button>
        {authError && <p className="text-red-500 mt-2">{authError}</p>}
      </div>
    );
  }

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">HOA {isAdmin ? "Admin" : "Member"} Portal</h1>
      <Tabs defaultValue="balances" className="w-full">
        <TabsList>
          <TabsTrigger value="balances">Member Balances</TabsTrigger>
          <TabsTrigger value="summary">Financial Summary</TabsTrigger>
          {isAdmin && <TabsTrigger value="admin">Admin Tools</TabsTrigger>}
        </TabsList>

        <TabsContent value="balances">
          <div className="flex justify-between mb-4">
            {isAdmin && <Button onClick={exportToExcel}>Export to Excel</Button>}
          </div>
          {/* ... rest remains unchanged ... */}
        </TabsContent>

        {/* ... summary and payment history unchanged ... */}

        <TabsContent value="admin">
          {isAdmin && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <h2 className="text-lg font-semibold">Create New User</h2>
                <Input type="text" placeholder="Full Name" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} />
                <Input type="email" placeholder="New user's email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} />
                <Input type="password" placeholder="Temporary password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} />
                <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)} className="w-full p-2 border rounded">
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <Button onClick={handleCreateUser}>Create User</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

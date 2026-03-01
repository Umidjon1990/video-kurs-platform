import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  UsersRound,
  Plus,
  Pencil,
  Trash2,
  UserPlus,
  UserMinus,
  Search,
  Users,
  FileDown,
  BookOpen,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { User } from "@shared/schema";

interface StudentGroup {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  memberCount: number;
}

interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  addedAt: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
}

export default function AdminGroupsPage() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [isAddMembersOpen, setIsAddMembersOpen] = useState(false);
  const [isAssignCourseOpen, setIsAssignCourseOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<StudentGroup | null>(null);
  const [groupForm, setGroupForm] = useState({ name: "", description: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [assignCourseData, setAssignCourseData] = useState({ courseId: "", subscriptionDays: "30" });

  const { data: groups = [], isLoading: groupsLoading } = useQuery<StudentGroup[]>({
    queryKey: ["/api/admin/student-groups"],
  });

  const { data: students = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: courses = [] } = useQuery<{ id: string; title: string }[]>({
    queryKey: ["/api/courses"],
  });

  const { data: groupMembers = [], isLoading: membersLoading } = useQuery<GroupMember[]>({
    queryKey: ["/api/admin/student-groups", selectedGroup?.id, "members"],
    enabled: !!selectedGroup?.id && isMembersOpen,
  });

  const { data: sessionCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ["/api/admin/user-sessions"],
    enabled: isMembersOpen,
    refetchInterval: 30000,
  });

  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const res = await apiRequest("POST", "/api/admin/student-groups", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/student-groups"] });
      setIsCreateOpen(false);
      setGroupForm({ name: "", description: "" });
      toast({ title: "Guruh yaratildi" });
    },
    onError: (error: any) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; description: string } }) => {
      const res = await apiRequest("PATCH", `/api/admin/student-groups/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/student-groups"] });
      setIsEditOpen(false);
      setSelectedGroup(null);
      toast({ title: "Guruh yangilandi" });
    },
    onError: (error: any) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/student-groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/student-groups"] });
      toast({ title: "Guruh o'chirildi" });
    },
    onError: (error: any) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  const addMembersMutation = useMutation({
    mutationFn: async ({ groupId, userIds }: { groupId: string; userIds: string[] }) => {
      const res = await apiRequest("POST", `/api/admin/student-groups/${groupId}/members/bulk`, { userIds });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/student-groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/student-groups", selectedGroup?.id, "members"] });
      setIsAddMembersOpen(false);
      setSelectedStudentIds([]);
      setSearchTerm("");
      toast({ title: "O'quvchilar guruhga qo'shildi" });
    },
    onError: (error: any) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      await apiRequest("DELETE", `/api/admin/student-groups/${groupId}/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/student-groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/student-groups", selectedGroup?.id, "members"] });
      toast({ title: "O'quvchi guruhdan chiqarildi" });
    },
    onError: (error: any) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  const assignCourseMutation = useMutation({
    mutationFn: async ({ groupId, courseId, subscriptionDays }: { groupId: string; courseId: string; subscriptionDays: string }) => {
      const res = await apiRequest("POST", `/api/admin/student-groups/${groupId}/assign-course`, { courseId, subscriptionDays });
      return res.json();
    },
    onSuccess: (data: any) => {
      setIsAssignCourseOpen(false);
      setAssignCourseData({ courseId: "", subscriptionDays: "30" });
      toast({ title: "Muvaffaqiyatli", description: data.message });
    },
    onError: (error: any) => {
      toast({ title: "Xatolik", description: error.message, variant: "destructive" });
    },
  });

  const downloadPdf = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(selectedGroup?.name || "Guruh", 14, 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Jami: ${groupMembers.length} ta o'quvchi`, 14, 26);
    doc.text(`Sana: ${new Date().toLocaleDateString("uz-UZ")}`, 14, 32);

    autoTable(doc, {
      startY: 38,
      head: [["#", "Ism Familiya", "Login (Telefon)", "Parol"]],
      body: groupMembers.map((m, i) => {
        const login = m.phone || m.email || "-";
        return [i + 1, `${m.firstName} ${m.lastName}`, login, login];
      }),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 248, 252] },
      columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: 60 }, 2: { cellWidth: 55 }, 3: { cellWidth: 55 } },
    });

    const noteY = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text("* Standart parol = login (telefon raqam). O'quvchi kirganidan keyin parolni o'zgartirishi mumkin.", 14, noteY);

    doc.save(`${selectedGroup?.name || "guruh"}-royxat.pdf`);
  };

  const openEditDialog = (group: StudentGroup) => {
    setSelectedGroup(group);
    setGroupForm({ name: group.name, description: group.description || "" });
    setIsEditOpen(true);
  };

  const openMembersDialog = (group: StudentGroup) => {
    setSelectedGroup(group);
    setIsMembersOpen(true);
  };

  const openAddMembersDialog = () => {
    setSelectedStudentIds([]);
    setSearchTerm("");
    setIsAddMembersOpen(true);
  };

  const memberUserIds = groupMembers.map((m) => m.userId);
  const availableStudents = students.filter(
    (s) => !memberUserIds.includes(s.id) && s.role === "student"
  );
  const filteredStudents = availableStudents.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      (s.firstName?.toLowerCase() || "").includes(term) ||
      (s.lastName?.toLowerCase() || "").includes(term) ||
      (s.phone?.toLowerCase() || "").includes(term) ||
      (s.email?.toLowerCase() || "").includes(term)
    );
  });

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            O'quvchi Guruhlari
          </h1>
          <p className="text-muted-foreground text-sm">
            Guruhlarni boshqaring va o'quvchilarni guruhlarga biriktiring
          </p>
        </div>
        <Button
          onClick={() => {
            setGroupForm({ name: "", description: "" });
            setIsCreateOpen(true);
          }}
          data-testid="button-create-group"
        >
          <Plus className="w-4 h-4 mr-2" />
          Yangi Guruh
        </Button>
      </div>

      {groupsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <UsersRound className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground">Hali guruh yaratilmagan</p>
            <Button
              onClick={() => {
                setGroupForm({ name: "", description: "" });
                setIsCreateOpen(true);
              }}
              data-testid="button-create-group-empty"
            >
              <Plus className="w-4 h-4 mr-2" />
              Birinchi Guruhni Yarating
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <Card key={group.id} data-testid={`card-group-${group.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
                <div className="min-w-0">
                  <CardTitle className="text-lg truncate" data-testid={`text-group-name-${group.id}`}>
                    {group.name}
                  </CardTitle>
                  {group.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {group.description}
                    </p>
                  )}
                </div>
                <Badge variant="secondary" data-testid={`badge-member-count-${group.id}`}>
                  <Users className="w-3 h-3 mr-1" />
                  {group.memberCount}
                </Badge>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openMembersDialog(group)}
                    data-testid={`button-view-members-${group.id}`}
                  >
                    <UsersRound className="w-4 h-4 mr-1" />
                    A'zolar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setSelectedGroup(group); setAssignCourseData({ courseId: "", subscriptionDays: "30" }); setIsAssignCourseOpen(true); }}
                    data-testid={`button-assign-course-group-${group.id}`}
                  >
                    <BookOpen className="w-4 h-4 mr-1" />
                    Kurs
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditDialog(group)}
                    data-testid={`button-edit-group-${group.id}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`"${group.name}" guruhini o'chirishni xohlaysizmi?`)) {
                        deleteGroupMutation.mutate(group.id);
                      }
                    }}
                    data-testid={`button-delete-group-${group.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Group Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yangi Guruh Yaratish</DialogTitle>
            <DialogDescription>Guruh nomi va tavsifini kiriting</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Guruh Nomi *</Label>
              <Input
                value={groupForm.name}
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                placeholder="masalan: 1-guruh"
                data-testid="input-group-name"
              />
            </div>
            <div>
              <Label>Tavsif</Label>
              <Textarea
                value={groupForm.description}
                onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                placeholder="Guruh haqida qisqacha ma'lumot"
                data-testid="input-group-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              onClick={() => createGroupMutation.mutate(groupForm)}
              disabled={!groupForm.name || createGroupMutation.isPending}
              data-testid="button-save-group"
            >
              {createGroupMutation.isPending ? "Yaratilmoqda..." : "Yaratish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guruhni Tahrirlash</DialogTitle>
            <DialogDescription>Guruh ma'lumotlarini o'zgartiring</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Guruh Nomi *</Label>
              <Input
                value={groupForm.name}
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                data-testid="input-edit-group-name"
              />
            </div>
            <div>
              <Label>Tavsif</Label>
              <Textarea
                value={groupForm.description}
                onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                data-testid="input-edit-group-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              onClick={() =>
                selectedGroup &&
                updateGroupMutation.mutate({
                  id: selectedGroup.id,
                  data: groupForm,
                })
              }
              disabled={!groupForm.name || updateGroupMutation.isPending}
              data-testid="button-update-group"
            >
              {updateGroupMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Members Dialog */}
      <Dialog open={isMembersOpen} onOpenChange={(open) => { setIsMembersOpen(open); if (!open) setSelectedGroup(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedGroup?.name} - A'zolari ({groupMembers.length})
            </DialogTitle>
            <DialogDescription>Guruh a'zolarini ko'ring va boshqaring</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Button onClick={openAddMembersDialog} data-testid="button-add-members">
                <UserPlus className="w-4 h-4 mr-2" />
                O'quvchi Qo'shish
              </Button>
              {groupMembers.length > 0 && (
                <Button variant="outline" onClick={downloadPdf} data-testid="button-download-pdf">
                  <FileDown className="w-4 h-4 mr-2" />
                  PDF Yuklab olish
                </Button>
              )}
            </div>

            {membersLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : groupMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Bu guruhda hali a'zo yo'q
              </div>
            ) : (
              <div className="overflow-y-auto max-h-[55vh] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Ism</TableHead>
                      <TableHead>Telefon/Email</TableHead>
                      <TableHead>Qo'shilgan</TableHead>
                      <TableHead>Qurilma</TableHead>
                      <TableHead>Amal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupMembers.map((member, index) => (
                      <TableRow key={member.id} data-testid={`row-member-${member.userId}`}>
                        <TableCell className="text-muted-foreground text-sm font-mono">{index + 1}</TableCell>
                        <TableCell>
                          {member.firstName} {member.lastName}
                        </TableCell>
                        <TableCell>{member.phone || member.email || "-"}</TableCell>
                        <TableCell>
                          {member.addedAt
                            ? new Date(member.addedAt).toLocaleDateString("uz-UZ")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {(sessionCounts[member.userId] ?? 0) > 0 ? (
                            <Badge variant="secondary">{sessionCounts[member.userId]} ta</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              selectedGroup &&
                              removeMemberMutation.mutate({
                                groupId: selectedGroup.id,
                                userId: member.userId,
                              })
                            }
                            data-testid={`button-remove-member-${member.userId}`}
                          >
                            <UserMinus className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Members Dialog */}
      <Dialog open={isAddMembersOpen} onOpenChange={setIsAddMembersOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>O'quvchilarni Guruhga Qo'shish</DialogTitle>
            <DialogDescription>
              {selectedGroup?.name} guruhiga qo'shiladigan o'quvchilarni tanlang
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ism, telefon yoki email bo'yicha qidiring..."
                className="pl-9"
                data-testid="input-search-students"
              />
            </div>

            {selectedStudentIds.length > 0 && (
              <Badge variant="secondary">
                {selectedStudentIds.length} ta o'quvchi tanlandi
              </Badge>
            )}

            <ScrollArea className="max-h-[300px] border rounded-md">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {searchTerm ? "Natija topilmadi" : "Qo'shish uchun o'quvchi yo'q"}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredStudents.map((student) => (
                    <label
                      key={student.id}
                      className="flex items-center gap-3 p-3 hover-elevate cursor-pointer"
                      data-testid={`label-student-${student.id}`}
                    >
                      <Checkbox
                        checked={selectedStudentIds.includes(student.id)}
                        onCheckedChange={() => toggleStudentSelection(student.id)}
                        data-testid={`checkbox-student-${student.id}`}
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-sm">
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {student.phone || student.email}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMembersOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              onClick={() =>
                selectedGroup &&
                addMembersMutation.mutate({
                  groupId: selectedGroup.id,
                  userIds: selectedStudentIds,
                })
              }
              disabled={selectedStudentIds.length === 0 || addMembersMutation.isPending}
              data-testid="button-confirm-add-members"
            >
              {addMembersMutation.isPending
                ? "Qo'shilmoqda..."
                : `${selectedStudentIds.length} ta Qo'shish`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Course to Group Dialog */}
      <Dialog open={isAssignCourseOpen} onOpenChange={(open) => { setIsAssignCourseOpen(open); if (!open) setAssignCourseData({ courseId: "", subscriptionDays: "30" }); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Guruhga Kurs Biriktirish</DialogTitle>
            <DialogDescription>
              <span className="font-semibold">{selectedGroup?.name}</span> guruhidagi barcha {selectedGroup?.memberCount} ta o'quvchiga kurs biriktiriladi
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Kurs *</Label>
              <Select
                value={assignCourseData.courseId}
                onValueChange={(v) => setAssignCourseData({ ...assignCourseData, courseId: v })}
              >
                <SelectTrigger data-testid="select-course-for-group">
                  <SelectValue placeholder="Kursni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-sub-days">Obuna muddati (kunlarda)</Label>
              <Input
                id="group-sub-days"
                type="number"
                min="1"
                placeholder="30"
                value={assignCourseData.subscriptionDays}
                onChange={(e) => setAssignCourseData({ ...assignCourseData, subscriptionDays: e.target.value })}
                data-testid="input-group-subscription-days"
              />
              <p className="text-xs text-muted-foreground">Allaqachon yozilgan o'quvchilar o'tkazib yuboriladi</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignCourseOpen(false)}>Bekor qilish</Button>
            <Button
              onClick={() => selectedGroup && assignCourseMutation.mutate({ groupId: selectedGroup.id, courseId: assignCourseData.courseId, subscriptionDays: assignCourseData.subscriptionDays })}
              disabled={!assignCourseData.courseId || assignCourseMutation.isPending}
              data-testid="button-confirm-assign-course-group"
            >
              {assignCourseMutation.isPending ? "Biriktirilmoqda..." : "Kurs Biriktirish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

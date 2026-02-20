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
} from "lucide-react";
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
  const [selectedGroup, setSelectedGroup] = useState<StudentGroup | null>(null);
  const [groupForm, setGroupForm] = useState({ name: "", description: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const { data: groups = [], isLoading: groupsLoading } = useQuery<StudentGroup[]>({
    queryKey: ["/api/admin/student-groups"],
  });

  const { data: students = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: groupMembers = [], isLoading: membersLoading } = useQuery<GroupMember[]>({
    queryKey: ["/api/admin/student-groups", selectedGroup?.id, "members"],
    enabled: !!selectedGroup?.id && isMembersOpen,
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
          <div className="space-y-4">
            <Button onClick={openAddMembersDialog} data-testid="button-add-members">
              <UserPlus className="w-4 h-4 mr-2" />
              O'quvchi Qo'shish
            </Button>

            {membersLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : groupMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Bu guruhda hali a'zo yo'q
              </div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ism</TableHead>
                      <TableHead>Telefon/Email</TableHead>
                      <TableHead>Qo'shilgan</TableHead>
                      <TableHead>Amal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupMembers.map((member) => (
                      <TableRow key={member.id} data-testid={`row-member-${member.userId}`}>
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
              </ScrollArea>
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
    </div>
  );
}

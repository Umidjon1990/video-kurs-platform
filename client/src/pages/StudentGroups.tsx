import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Calendar, User } from "lucide-react";
import { motion } from "framer-motion";

export default function StudentGroups() {
  const { user } = useAuth();

  const { data: groups, isLoading } = useQuery<any[]>({
    queryKey: ["/api/student/my-groups"],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!groups || groups.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6" data-testid="text-page-title">Mening Guruhlarim</h1>
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Hali guruhga qo'shilmagansiz</h3>
            <p className="text-muted-foreground text-sm">Admin sizni guruhga qo'shganda bu yerda ko'rinadi</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6" data-testid="text-page-title">Mening Guruhlarim</h1>

      <div className="space-y-6">
        {groups.map((group: any, idx: number) => (
          <motion.div
            key={group.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card data-testid={`card-group-${group.id}`}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-lg truncate" data-testid={`text-group-name-${group.id}`}>{group.name}</CardTitle>
                    {group.description && (
                      <p className="text-sm text-muted-foreground truncate">{group.description}</p>
                    )}
                  </div>
                </div>
                <Badge variant="secondary" data-testid={`badge-member-count-${group.id}`}>
                  <Users className="w-3 h-3 mr-1" />
                  {group.memberCount} a'zo
                </Badge>
              </CardHeader>
              <CardContent className="pt-0">
                {group.addedAt && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Qo'shilgan: {new Date(group.addedAt).toLocaleDateString('uz-UZ')}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Guruh a'zolari:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.members?.map((member: any) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50"
                        data-testid={`member-${member.id}`}
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {(member.firstName?.[0] || '') + (member.lastName?.[0] || '')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {member.firstName} {member.lastName}
                            {member.id === user?.id && (
                              <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0">Siz</Badge>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {member.phone || member.email || ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

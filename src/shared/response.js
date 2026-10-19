export function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName ?? user.display_name,
    role: user.role,
  };
}

export function publicStudent(row) {
  return {
    id: row.id,
    studentId: row.student_id,
    nameBn: row.name_bn,
    nameEn: row.name_en,
    phone: row.phone,
    address: row.address,
    dateOfBirth: row.date_of_birth,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function publicFeeItem(row) {
  return {
    id: row.id,
    enrollmentId: row.enrollment_id,
    title: row.title,
    amount: row.amount,
    allocated: row.allocated,
    outstanding: row.outstanding,
    status: row.status,
    dueDate: row.due_date,
  };
}

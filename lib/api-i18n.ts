import { NextRequest } from "next/server";

export type ApiLocale = "zh" | "en";

const apiMessages = {
  unauthorized: {
    zh: "未授权访问",
    en: "Unauthorized access",
  },
  userNotFound: {
    zh: "用户不存在",
    en: "User not found",
  },
  adminOnly: {
    zh: "权限不足，仅管理员可操作",
    en: "Insufficient permissions. Admin access is required.",
  },
  adminOrEventManagerOnly: {
    zh: "权限不足，仅管理员或活动管理员可操作",
    en: "Insufficient permissions. Admin or event manager access is required.",
  },
  adminOrSpecialPassManagerOnly: {
    zh: "权限不足，仅管理员或特别通行证管理员可操作",
    en: "Insufficient permissions. Admin or special pass manager access is required.",
  },
  invalidEmailRequired: {
    zh: "请提供有效的邮箱地址",
    en: "Please provide a valid email address.",
  },
  forgotEmailSent: {
    zh: "如果您的邮箱已注册，您将收到密码重置链接",
    en: "If your email is registered, you will receive a password reset link.",
  },
  mailUnavailable: {
    zh: "邮件服务暂不可用，请稍后重试",
    en: "The mail service is temporarily unavailable. Please try again later.",
  },
  forgotFailed: {
    zh: "请求失败，请稍后重试",
    en: "The request failed. Please try again later.",
  },
  resetTokenRequired: {
    zh: "请提供有效的重置令牌",
    en: "Please provide a valid reset token.",
  },
  resetTokenMissing: {
    zh: "请提供重置令牌",
    en: "Please provide a reset token.",
  },
  newPasswordRequired: {
    zh: "请提供新密码",
    en: "Please provide a new password.",
  },
  passwordMin: {
    zh: "密码长度至少为8位",
    en: "Password must be at least 8 characters long.",
  },
  resetLinkInvalid: {
    zh: "重置链接无效",
    en: "This reset link is invalid.",
  },
  resetLinkExpiredRequest: {
    zh: "重置链接已过期，请重新申请",
    en: "This reset link has expired. Please request a new one.",
  },
  resetLinkExpired: {
    zh: "重置链接已过期",
    en: "This reset link has expired.",
  },
  resetSuccess: {
    zh: "密码重置成功，请使用新密码登录",
    en: "Password reset successful. Please sign in with your new password.",
  },
  resetFailed: {
    zh: "重置密码失败，请稍后重试",
    en: "Failed to reset the password. Please try again later.",
  },
  resetValidateFailed: {
    zh: "验证重置链接失败",
    en: "Failed to validate the reset link.",
  },
  resetLinkValid: {
    zh: "重置链接有效",
    en: "The reset link is valid.",
  },
  registerRequired: {
    zh: "请填写所有必填项",
    en: "Please complete all required fields.",
  },
  invalidEmailFormat: {
    zh: "邮箱格式不正确",
    en: "Email format is invalid.",
  },
  invalidRole: {
    zh: "无效的用户角色",
    en: "Invalid user role.",
  },
  emailTaken: {
    zh: "该邮箱已被注册",
    en: "This email address is already registered.",
  },
  nameTaken: {
    zh: "该姓名已被注册",
    en: "This name is already registered.",
  },
  registerSuccessLogin: {
    zh: "注册成功，请登录",
    en: "Registration successful. Please sign in.",
  },
  registerSuccessReview: {
    zh: "注册成功，请等待审核",
    en: "Registration successful. Please wait for approval.",
  },
  registerFailed: {
    zh: "注册失败，请稍后重试",
    en: "Registration failed. Please try again later.",
  },
  profileFetchFailed: {
    zh: "获取用户资料失败",
    en: "Failed to fetch the user profile.",
  },
  profileUpdateSuccess: {
    zh: "用户资料更新成功",
    en: "Profile updated successfully.",
  },
  profileUpdateFailed: {
    zh: "更新用户资料失败",
    en: "Failed to update the user profile.",
  },
  nameRequired: {
    zh: "姓名不能为空",
    en: "Name cannot be empty.",
  },
  oldAndNewPasswordRequired: {
    zh: "请提供旧密码和新密码",
    en: "Please provide your current password and a new password.",
  },
  newPasswordCannotSame: {
    zh: "新密码不能与旧密码相同",
    en: "The new password cannot be the same as the current password.",
  },
  passwordUpdateUserMissing: {
    zh: "用户不存在或无法修改密码",
    en: "The user does not exist or the password cannot be changed.",
  },
  oldPasswordIncorrect: {
    zh: "旧密码不正确",
    en: "The current password is incorrect.",
  },
  passwordChangeSuccess: {
    zh: "密码修改成功",
    en: "Password changed successfully.",
  },
  passwordChangeFailed: {
    zh: "修改密码失败，请稍后重试",
    en: "Failed to change the password. Please try again later.",
  },
  speakerListFetchFailed: {
    zh: "获取嘉宾列表失败",
    en: "Failed to fetch the speaker list.",
  },
  trackListFetchFailed: {
    zh: "获取赛道列表失败",
    en: "Failed to fetch the track list.",
  },
  trackRequired: {
    zh: "请填写赛道编号、名称、描述、分类、颜色和图标",
    en: "Please provide the track code, name, description, category, color, and icon.",
  },
  invalidTrackCategory: {
    zh: "无效的赛道分类",
    en: "Invalid track category.",
  },
  trackCodeExists: {
    zh: "该赛道编号已存在",
    en: "This track code already exists.",
  },
  trackNotFound: {
    zh: "赛道不存在",
    en: "Track not found.",
  },
  trackHasEvents: {
    zh: "该赛道下仍有关联活动，请先调整活动归属",
    en: "This track still has linked events. Reassign those events before deleting it.",
  },
  trackCreateSuccess: {
    zh: "赛道创建成功",
    en: "Track created successfully.",
  },
  trackCreateFailed: {
    zh: "创建赛道失败",
    en: "Failed to create the track.",
  },
  trackUpdateSuccess: {
    zh: "赛道更新成功",
    en: "Track updated successfully.",
  },
  trackUpdateFailed: {
    zh: "更新赛道失败",
    en: "Failed to update the track.",
  },
  trackDeleteSuccess: {
    zh: "赛道删除成功",
    en: "Track deleted successfully.",
  },
  trackDeleteFailed: {
    zh: "删除赛道失败",
    en: "Failed to delete the track.",
  },
  speakerRequired: {
    zh: "姓名、职位和机构为必填项",
    en: "Name, title, and organization are required.",
  },
  speakerNotFound: {
    zh: "嘉宾不存在",
    en: "Speaker not found.",
  },
  speakerDetailFetchFailed: {
    zh: "获取嘉宾详情失败",
    en: "Failed to fetch speaker details.",
  },
  speakerUpdateRequired: {
    zh: "姓名、职位和机构不能为空",
    en: "Name, title, and organization cannot be empty.",
  },
  speakerCreateSuccess: {
    zh: "嘉宾创建成功",
    en: "Speaker created successfully.",
  },
  speakerCreateFailed: {
    zh: "创建嘉宾失败",
    en: "Failed to create the speaker.",
  },
  speakerUpdateSuccess: {
    zh: "嘉宾更新成功",
    en: "Speaker updated successfully.",
  },
  speakerUpdateFailed: {
    zh: "更新嘉宾失败",
    en: "Failed to update the speaker.",
  },
  speakerDeleteSuccess: {
    zh: "嘉宾删除成功",
    en: "Speaker deleted successfully.",
  },
  speakerDeleteFailed: {
    zh: "删除嘉宾失败",
    en: "Failed to delete the speaker.",
  },
  sponsorListFetchFailed: {
    zh: "获取赞助商列表失败",
    en: "Failed to fetch the sponsor list.",
  },
  sponsorRequired: {
    zh: "名称、Logo 和级别为必填项",
    en: "Name, logo, and tier are required.",
  },
  sponsorInvalidTier: {
    zh: "无效的赞助级别，可选值: platinum, gold, silver, bronze, partner",
    en: "Invalid sponsor tier. Valid values are platinum, gold, silver, bronze, and partner.",
  },
  sponsorNotFound: {
    zh: "赞助商不存在",
    en: "Sponsor not found.",
  },
  sponsorDetailFetchFailed: {
    zh: "获取赞助商详情失败",
    en: "Failed to fetch sponsor details.",
  },
  sponsorCreateSuccess: {
    zh: "赞助商创建成功",
    en: "Sponsor created successfully.",
  },
  sponsorCreateFailed: {
    zh: "创建赞助商失败",
    en: "Failed to create the sponsor.",
  },
  sponsorUpdateSuccess: {
    zh: "赞助商更新成功",
    en: "Sponsor updated successfully.",
  },
  sponsorUpdateFailed: {
    zh: "更新赞助商失败",
    en: "Failed to update the sponsor.",
  },
  sponsorDeleteSuccess: {
    zh: "赞助商删除成功",
    en: "Sponsor deleted successfully.",
  },
  sponsorDeleteFailed: {
    zh: "删除赞助商失败",
    en: "Failed to delete the sponsor.",
  },
  staffOrAdminOnly: {
    zh: "权限不足，仅管理员或工作人员可操作",
    en: "Insufficient permissions. Admin or staff access is required.",
  },
  usersListFetchFailed: {
    zh: "获取用户列表失败",
    en: "Failed to fetch the user list.",
  },
  userDetailFetchFailed: {
    zh: "获取用户详情失败",
    en: "Failed to fetch user details.",
  },
  currentUserMissing: {
    zh: "当前用户不存在",
    en: "The current user was not found.",
  },
  targetAdminProtected: {
    zh: "无权修改管理员信息",
    en: "You do not have permission to modify an administrator account.",
  },
  adminOnlyRoleStatus: {
    zh: "仅管理员可以修改角色或状态",
    en: "Only administrators can update role or status.",
  },
  usePasswordFlow: {
    zh: "请使用专用密码修改流程",
    en: "Please use the dedicated password update flow.",
  },
  emailInUseByOther: {
    zh: "该邮箱已被其他用户使用",
    en: "This email address is already used by another account.",
  },
  nameInUseByOther: {
    zh: "该姓名已被其他用户使用",
    en: "This name is already used by another account.",
  },
  invalidUserStatus: {
    zh: "无效的用户状态",
    en: "Invalid user status.",
  },
  userCreateRequired: {
    zh: "请填写所有必填项（姓名、邮箱、密码）",
    en: "Please provide the required fields: name, email, and password.",
  },
  userCreateAdminOnly: {
    zh: "权限不足，仅管理员可创建用户",
    en: "Insufficient permissions. Only administrators can create users.",
  },
  userDeleteAdminOnly: {
    zh: "权限不足，仅管理员可删除用户",
    en: "Insufficient permissions. Only administrators can delete users.",
  },
  userCreateSuccess: {
    zh: "用户创建成功",
    en: "User created successfully.",
  },
  userCreateFailed: {
    zh: "创建用户失败，请稍后重试",
    en: "Failed to create the user. Please try again later.",
  },
  userUpdateSuccess: {
    zh: "用户信息更新成功",
    en: "User updated successfully.",
  },
  userUpdateFailed: {
    zh: "更新用户信息失败",
    en: "Failed to update the user.",
  },
  userDeleteSuccess: {
    zh: "用户删除成功",
    en: "User deleted successfully.",
  },
  userDeleteFailed: {
    zh: "删除用户失败",
    en: "Failed to delete the user.",
  },
  cannotDeleteSelf: {
    zh: "不能删除自己的账户",
    en: "You cannot delete your own account.",
  },
  eventListFetchFailed: {
    zh: "获取活动列表失败",
    en: "Failed to fetch the event list.",
  },
  eventDetailFetchFailed: {
    zh: "获取活动详情失败",
    en: "Failed to fetch event details.",
  },
  eventNotFound: {
    zh: "活动不存在",
    en: "Event not found.",
  },
  eventRequired: {
    zh: "活动标题、描述、日期、时间、地点和类型为必填项",
    en: "Title, description, date, time, venue, and type are required.",
  },
  invalidEventType: {
    zh: "无效的活动类型",
    en: "Invalid event type.",
  },
  invalidEventDate: {
    zh: "无效的活动日期",
    en: "Invalid event date.",
  },
  eventCreateSuccess: {
    zh: "活动创建成功",
    en: "Event created successfully.",
  },
  eventCreateFailed: {
    zh: "创建活动失败",
    en: "Failed to create the event.",
  },
  eventUpdateSuccess: {
    zh: "活动更新成功",
    en: "Event updated successfully.",
  },
  eventUpdateFailed: {
    zh: "更新活动失败",
    en: "Failed to update the event.",
  },
  eventDeleteSuccess: {
    zh: "活动删除成功",
    en: "Event deleted successfully.",
  },
  eventDeleteFailed: {
    zh: "删除活动失败",
    en: "Failed to delete the event.",
  },
  eventAlreadyRegistered: {
    zh: "您已报名该活动",
    en: "You are already registered for this event.",
  },
  eventCapacityReached: {
    zh: "该活动报名人数已满",
    en: "This event has reached capacity.",
  },
  eventRegisterSuccess: {
    zh: "报名成功！请前往活动通行证页面确认报名状态。",
    en: "Registration successful! Please visit your Event Pass to confirm your registration.",
  },
  eventRegisterClosed: {
    zh: "该活动不接受报名申请",
    en: "This event is not accepting registrations.",
  },
  eventRegisterFailed: {
    zh: "活动报名失败",
    en: "Failed to register for the event.",
  },
  registrationNotFound: {
    zh: "未找到对应的报名记录",
    en: "The registration record could not be found.",
  },
  registrationCannotCancel: {
    zh: "当前报名状态不支持取消",
    en: "This registration can no longer be cancelled.",
  },
  registrationCancelSuccess: {
    zh: "报名已取消",
    en: "Registration cancelled successfully.",
  },
  registrationCancelFailed: {
    zh: "取消报名失败",
    en: "Failed to cancel the registration.",
  },
  qrMissingEventId: {
    zh: "缺少活动ID",
    en: "Missing event ID.",
  },
  qrEventNotRegistered: {
    zh: "未报名该活动",
    en: "You are not registered for this event.",
  },
  qrRegistrationCancelled: {
    zh: "报名已取消",
    en: "The registration has been cancelled.",
  },
  qrUnsupportedType: {
    zh: "不支持的二维码类型",
    en: "Unsupported QR code type.",
  },
  qrGenerateFailed: {
    zh: "生成二维码失败",
    en: "Failed to generate the QR code.",
  },
  checkinForbidden: {
    zh: "无权限执行此操作",
    en: "You do not have permission to perform this action.",
  },
  checkinQrDataRequired: {
    zh: "缺少二维码数据",
    en: "QR code data is required.",
  },
  invalidQrFormat: {
    zh: "无效的二维码格式",
    en: "Invalid QR code format.",
  },
  passportVerificationFailed: {
    zh: "身份验证失败",
    en: "Passport verification failed.",
  },
  passportVerificationSuccess: {
    zh: "身份验证成功",
    en: "Passport verification succeeded.",
  },
  qrExpired: {
    zh: "二维码已过期，请用户刷新二维码",
    en: "The QR code has expired. Please ask the user to refresh it.",
  },
  qrNotActiveYet: {
    zh: "活动尚未进入检票时段，请在入场开放后再扫描二维码签到",
    en: "This event pass is not active yet. Please present it once entry opens.",
  },
  qrEventEnded: {
    zh: "活动已结束，通行证已失效",
    en: "This event has ended, and the pass is no longer valid.",
  },
  qrAlreadyUsed: {
    zh: "该活动通行证已完成入场，不能再次使用",
    en: "This event pass has already been used for entry and cannot be reused.",
  },
  qrWrongEvent: {
    zh: "该通行证不属于当前活动",
    en: "This pass does not belong to the current event.",
  },
  verifierNotAssigned: {
    zh: "您未被分配验证此活动，请联系管理员",
    en: "You are not assigned to verify this event. Please contact the administrator.",
  },
  selfCheckinNotRegistered: {
    zh: "您尚未报名此活动，无法签到",
    en: "You have not registered for this event and cannot check in.",
  },
  invalidRegistration: {
    zh: "无效的报名记录",
    en: "Invalid registration record.",
  },
  alreadyCheckedIn: {
    zh: "该用户已完成签到",
    en: "This attendee has already checked in.",
  },
  checkinSuccess: {
    zh: "签到成功",
    en: "Check-in successful.",
  },
  checkinFailed: {
    zh: "验码失败",
    en: "Failed to verify the QR code.",
  },
  checkinHistoryFetchFailed: {
    zh: "获取验码记录失败",
    en: "Failed to fetch check-in records.",
  },
  userActivitiesFetchFailed: {
    zh: "获取用户活动记录失败",
    en: "Failed to fetch user activity records.",
  },
  eventIdRequired: {
    zh: "缺少活动ID",
    en: "Event ID is required.",
  },
  wishlistAlreadyExists: {
    zh: "已经收藏该活动",
    en: "This event is already in the wishlist.",
  },
  wishlistAddSuccess: {
    zh: "收藏成功",
    en: "Added to wishlist successfully.",
  },
  wishlistRemoveSuccess: {
    zh: "取消收藏成功",
    en: "Removed from wishlist successfully.",
  },
  unsupportedAction: {
    zh: "不支持的操作",
    en: "Unsupported action.",
  },
  wishlistOperationFailed: {
    zh: "操作失败",
    en: "The operation failed.",
  },
  pointsViewForbidden: {
    zh: "无权限查看",
    en: "You do not have permission to view these points.",
  },
  pointsFetchFailed: {
    zh: "获取积分记录失败",
    en: "Failed to fetch point records.",
  },
  pointsInvalidValue: {
    zh: "积分数值无效",
    en: "Invalid points value.",
  },
  pointsReasonRequired: {
    zh: "请提供调整原因",
    en: "Please provide a reason for the adjustment.",
  },
  pointsInsufficient: {
    zh: "用户积分不足",
    en: "The user does not have enough points.",
  },
  pointsAdjustFailed: {
    zh: "调整积分失败",
    en: "Failed to adjust points.",
  },
  roleSelfUpdateForbidden: {
    zh: "不能修改自己的角色",
    en: "You cannot update your own role.",
  },
  invalidRoleValue: {
    zh: "无效的角色",
    en: "Invalid role value.",
  },
  roleUpdateSuccess: {
    zh: "角色更新成功",
    en: "Role updated successfully.",
  },
  roleUpdateFailed: {
    zh: "更新角色失败",
    en: "Failed to update the role.",
  },
  // Invitation Request messages
  invitationGuestNameRequired: {
    zh: "请填写嘉宾姓名",
    en: "Guest name is required.",
  },
  invitationCreateSuccess: {
    zh: "邀请函申请提交成功",
    en: "Invitation request submitted successfully.",
  },
  invitationCreateFailed: {
    zh: "提交邀请函申请失败",
    en: "Failed to submit the invitation request.",
  },
  invitationListFetchFailed: {
    zh: "获取邀请函列表失败",
    en: "Failed to fetch invitation requests.",
  },
  invitationNotFound: {
    zh: "邀请函申请不存在",
    en: "Invitation request not found.",
  },
  invitationUpdateSuccess: {
    zh: "邀请函申请更新成功",
    en: "Invitation request updated successfully.",
  },
  invitationUpdateFailed: {
    zh: "更新邀请函申请失败",
    en: "Failed to update the invitation request.",
  },
  invitationInvalidStatus: {
    zh: "无效的邀请函状态",
    en: "Invalid invitation status.",
  },
  // Upload messages
  forbidden: {
    zh: "没有操作权限",
    en: "Access denied.",
  },
  uploadNoFile: {
    zh: "请选择要上传的文件",
    en: "Please select a file to upload.",
  },
  uploadInvalidType: {
    zh: "不支持的文件类型，仅支持 PDF、PNG、JPG、WebP",
    en: "Unsupported file type. Only PDF, PNG, JPG, and WebP are allowed.",
  },
  uploadTooLarge: {
    zh: "文件大小不能超过 10MB",
    en: "File size must not exceed 10MB.",
  },
  uploadFailed: {
    zh: "文件上传失败",
    en: "Failed to upload the file.",
  },
  contactRequired: {
    zh: "请填写姓名、邮箱、主题和消息内容",
    en: "Name, email, subject, and message are required.",
  },
  contactInvalidCategory: {
    zh: "无效的咨询类型",
    en: "Invalid inquiry type.",
  },
  contactSuccess: {
    zh: "消息已发送，我们会尽快回复",
    en: "Message sent. We will get back to you soon.",
  },
  contactFailed: {
    zh: "消息发送失败，请稍后重试",
    en: "Failed to send the message. Please try again later.",
  },
  contactMissingId: {
    zh: "缺少消息ID",
    en: "Message ID is required.",
  },
  contactNotFound: {
    zh: "消息不存在",
    en: "Message not found.",
  },
  // Registration approval messages
  eventRegisterPendingApproval: {
    zh: "报名申请已提交，请耐心等待管理员审批。审批完成后，请及时查看活动通行证。",
    en: "Your registration request has been submitted and is awaiting admin approval. Please check your Event Pass for updates.",
  },
  qrRegistrationPendingApproval: {
    zh: "报名尚未审批通过，无法生成通行证",
    en: "Registration is pending approval. Pass cannot be generated.",
  },
  qrRegistrationRejected: {
    zh: "报名已被拒绝",
    en: "Registration has been rejected.",
  },
  registrationListFetchFailed: {
    zh: "获取报名列表失败",
    en: "Failed to fetch registration list.",
  },
  registrationInvalidAction: {
    zh: "无效的操作或缺少报名ID",
    en: "Invalid action or missing registration IDs.",
  },
  registrationCapacityExceeded: {
    zh: "无法批准：超出活动人数限制",
    en: "Cannot approve: event capacity would be exceeded.",
  },
  registrationApproveSuccess: {
    zh: "报名已批准",
    en: "Registrations approved successfully.",
  },
  registrationRejectSuccess: {
    zh: "报名已拒绝",
    en: "Registrations rejected.",
  },
  registrationActionFailed: {
    zh: "操作失败",
    en: "Failed to process registration action.",
  },
  internalServerError: {
    zh: "服务器内部错误",
    en: "Internal server error.",
  },
} as const;

type ApiMessageKey = keyof typeof apiMessages;

export function resolveRequestLocale(req: NextRequest, explicitLocale?: unknown): ApiLocale {
  if (explicitLocale === "en" || explicitLocale === "zh") {
    return explicitLocale;
  }

  const cookieLocale = req.cookies.get("NEXT_LOCALE")?.value;
  if (cookieLocale === "en" || cookieLocale === "zh") {
    return cookieLocale;
  }

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const pathname = new URL(referer).pathname;
      if (pathname.startsWith("/en")) {
        return "en";
      }
      if (pathname.startsWith("/zh")) {
        return "zh";
      }
    } catch {
      // Ignore malformed referer values.
    }
  }

  const acceptLanguage = req.headers.get("accept-language") || "";
  if (acceptLanguage.toLowerCase().startsWith("en")) {
    return "en";
  }

  return "zh";
}

export function apiMessage(locale: ApiLocale, key: ApiMessageKey) {
  return apiMessages[key][locale];
}
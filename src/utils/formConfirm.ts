/** Drawer 表单关闭确认文案（区分表单未提交 vs 附件已即时保存） */
export function getCloseConfirmContent(formDirty: boolean, filesDirty: boolean): string {
  if (formDirty && filesDirty) {
    return '表单修改尚未提交。附件上传/删除已即时保存，关闭后表单修改将丢失，附件变更无法撤销。';
  }
  if (filesDirty) {
    return '附件上传/删除已即时保存，关闭后无法撤销附件操作。';
  }
  return '表单修改尚未提交，关闭后将丢失。';
}

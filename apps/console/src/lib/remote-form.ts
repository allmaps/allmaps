type SubmittableRemoteForm = {
  submit: () => Promise<boolean>
}

export async function submitRemoteFormWithoutReset(
  form: SubmittableRemoteForm
) {
  await form.submit()
}

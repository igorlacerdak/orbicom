const digitsOnly = (value: string): string => value.replace(/\D/g, "");

export const formatCpfCnpj = (value: string): string => {
  const digits = digitsOnly(value).slice(0, 14);

  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
};

export const formatPhoneBr = (value: string): string => {
  const digits = digitsOnly(value).slice(0, 11);

  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }

  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
};

export const formatCep = (value: string): string => {
  const digits = digitsOnly(value).slice(0, 8);
  return digits.replace(/(\d{5})(\d{1,3})$/, "$1-$2");
};

export const formatStateCode = (value: string): string =>
  value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 2);

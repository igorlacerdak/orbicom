"use client";

import Image from "next/image";
import { ChangeEvent } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { UseFormRegister, UseFormSetValue } from "react-hook-form";
import { toast } from "sonner";

import { QuoteFormInput } from "@/domain/quote.schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type LogoUploadProps = {
  logoDataUrl?: string;
  setValue: UseFormSetValue<QuoteFormInput>;
  register: UseFormRegister<QuoteFormInput>;
};

const MAX_FILE_SIZE_MB = 2;

export const LogoUpload = ({ logoDataUrl, setValue, register }: LogoUploadProps) => {
  const onSelectLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const maxSize = MAX_FILE_SIZE_MB * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Use uma imagem de ate 2MB para o logo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setValue("company.logoDataUrl", String(reader.result), {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <Card className="border-border/70 bg-card/95 shadow-sm backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg">Logo da empresa</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <input type="hidden" {...register("company.logoDataUrl")} />
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-muted">
            {logoDataUrl ? (
              <Image src={logoDataUrl} alt="Logo da empresa" width={80} height={80} className="h-full w-full object-contain" />
            ) : (
              <ImagePlus className="text-muted-foreground" />
            )}
          </div>

          <p className="text-xs text-muted-foreground">Formato recomendado: PNG/JPG, ate 2MB.</p>
        </div>

        <div className="flex gap-2">
          <label className="inline-flex">
            <input type="file" accept="image/*" className="hidden" onChange={onSelectLogo} />
            <span className="inline-flex cursor-pointer items-center rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted">
              Enviar logo
            </span>
          </label>
          <Button
            type="button"
            variant="outline"
            onClick={() => setValue("company.logoDataUrl", "", { shouldDirty: true })}
          >
            <Trash2 />
            Remover
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

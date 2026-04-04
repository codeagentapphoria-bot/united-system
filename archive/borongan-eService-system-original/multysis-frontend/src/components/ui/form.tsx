"use client"

import * as LabelPrimitive from "@radix-ui/react-label"
import { Slot } from "@radix-ui/react-slot"
import * as React from "react"
import {
    Controller,
    FormProvider,
    useFormContext,
    type ControllerProps,
    type FieldPath,
    type FieldValues,
} from "react-hook-form"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const Form = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  
  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>")
  }

  if (!itemContext) {
    throw new Error("useFormField should be used within <FormItem>")
  }

  // Get form context - this will throw if not within Form provider
  // We check fieldContext and itemContext first so the error message is more specific
  let formContext;
  try {
    formContext = useFormContext();
    // Verify formContext has required properties
    if (!formContext || !formContext.getFieldState || !formContext.formState) {
      throw new Error("useFormField should be used within <Form> provider")
    }
  } catch (error: any) {
    // If it's already our error, rethrow it
    if (error.message?.includes("Form")) {
      throw error;
    }
    // Otherwise, it's a react-hook-form error about missing provider
    throw new Error("useFormField should be used within <Form> provider")
  }

  const { getFieldState, formState } = formContext
  const fieldState = getFieldState(fieldContext.name, formState)

  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

type FormItemContextValue = {
  id: string
}

const FormItemContext = React.createContext<FormItemContextValue | null>(null)

const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const id = React.useId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <div ref={ref} className={cn("space-y-2", className)} {...props} />
    </FormItemContext.Provider>
  )
})
FormItem.displayName = "FormItem"

const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
  try {
    const { error, formItemId } = useFormField()

    return (
      <Label
        ref={ref}
        className={cn(error && "text-destructive", className)}
        htmlFor={formItemId}
        {...props}
      />
    )
  } catch (error: any) {
    // If useFormField fails (missing context), render a regular Label without form integration
    // This allows the component to render without crashing, though it won't have form features
    // Silently handle the error - component will still work without form integration
    return (
      <Label
        ref={ref}
        className={className}
        {...props}
      />
    )
  }
})
FormLabel.displayName = "FormLabel"

const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  try {
    const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

    return (
      <Slot
        ref={ref}
        id={formItemId}
        aria-describedby={
          !error
            ? `${formDescriptionId}`
            : `${formDescriptionId} ${formMessageId}`
        }
        aria-invalid={!!error}
        {...props}
      />
    )
  } catch (error: any) {
    // If useFormField fails, render Slot without form integration
    // Silently handle the error - component will still work without form integration
    return <Slot ref={ref} {...props} />
  }
})
FormControl.displayName = "FormControl"

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  try {
    const { formDescriptionId } = useFormField()

    return (
      <p
        ref={ref}
        id={formDescriptionId}
        className={cn("text-[0.8rem] text-muted-foreground", className)}
        {...props}
      />
    )
  } catch (error: any) {
    // If useFormField fails, render without form integration
    return (
      <p
        ref={ref}
        className={cn("text-[0.8rem] text-muted-foreground", className)}
        {...props}
      />
    )
  }
})
FormDescription.displayName = "FormDescription"

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  try {
    const { error, formMessageId } = useFormField()
    const body = error ? String(error?.message ?? "") : children

    if (!body) {
      return null
    }

    return (
      <p
        ref={ref}
        id={formMessageId}
        className={cn("text-[0.8rem] font-medium text-destructive", className)}
        {...props}
      >
        {body}
      </p>
    )
  } catch (error: any) {
    // If useFormField fails and we have children, render them anyway
    if (children) {
      return (
        <p
          ref={ref}
          className={cn("text-[0.8rem] font-medium text-destructive", className)}
          {...props}
        >
          {children}
        </p>
      )
    }
    return null
  }
})
FormMessage.displayName = "FormMessage"

export {
    Form, FormControl,
    FormDescription, FormField, FormItem,
    FormLabel, FormMessage, useFormField
}


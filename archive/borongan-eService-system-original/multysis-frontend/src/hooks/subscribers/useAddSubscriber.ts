import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { AddSubscriberInput } from '@/validations/subscriber.schema';
import { addSubscriberSchema } from '@/validations/subscriber.schema';

export const useAddSubscriber = () => {
  const form = useForm<AddSubscriberInput>({
    resolver: zodResolver(addSubscriberSchema),
    defaultValues: {
      countryCode: '+63',
      isCitizen: false,
      mobileNumber: '', // Ensure mobileNumber is always a string, not undefined
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
    },
  });

  return {
    form,
    handleSubmit: form.handleSubmit,
    reset: form.reset,
  };
};


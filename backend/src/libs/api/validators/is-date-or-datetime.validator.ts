import { ValidationArguments, ValidationOptions, registerDecorator } from 'class-validator';
import { isValid, parseISO } from 'date-fns';

export function IsValidDateOrDateTime(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidDateOrDateTime',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, _args: ValidationArguments) {
          if (typeof value !== 'string') return false;

          try {
            const parsed = parseISO(value.trim());
            return isValid(parsed);
          } catch {
            return false;
          }
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid ISO date (YYYY-MM-DD) or datetime (YYYY-MM-DDTHH:mm:ss.sssZ)`;
        },
      },
    });
  };
}

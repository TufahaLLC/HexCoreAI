import type { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AnalysisFormData } from "@/types/analysis";

type AnalysisFormProps = {
  form: UseFormReturn<AnalysisFormData>;
  onSubmit: (data: AnalysisFormData) => void;
  isDisabled: boolean;
  isConnecting: boolean;
};

export const AnalysisForm = ({
  form,
  onSubmit,
  isDisabled,
  isConnecting,
}: AnalysisFormProps) => (
  <Form {...form}>
    <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <FormLabel className="font-medium text-foreground text-sm">
            Game Name
          </FormLabel>
          <FormField
            control={form.control}
            name="gameName"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    className="h-11 transition-colors focus:ring-2 focus:ring-primary/20"
                    disabled={isDisabled}
                    placeholder="e.g., Faker"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="space-y-2">
          <FormLabel className="font-medium text-foreground text-sm">
            Tag Line
          </FormLabel>
          <FormField
            control={form.control}
            name="tagLine"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    className="h-11 transition-colors focus:ring-2 focus:ring-primary/20"
                    disabled={isDisabled}
                    placeholder="e.g., KR1"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <FormLabel className="font-medium text-foreground text-sm">
            Region
          </FormLabel>
          <FormField
            control={form.control}
            name="region"
            render={({ field }) => (
              <FormItem>
                <Select
                  defaultValue={field.value}
                  disabled={isDisabled}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger className="h-11 transition-colors focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="americas">Americas</SelectItem>
                    <SelectItem value="europe">Europe</SelectItem>
                    <SelectItem value="asia">Asia</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="space-y-2">
          <FormLabel className="font-medium text-foreground text-sm">
            Year
          </FormLabel>
          <FormField
            control={form.control}
            name="year"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    className="h-11 transition-colors focus:ring-2 focus:ring-primary/20"
                    disabled={isDisabled}
                    max={2030}
                    min={2020}
                    placeholder="2024"
                    type="number"
                    {...field}
                    onChange={(e) =>
                      field.onChange(Number.parseInt(e.target.value, 10))
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <Button
        className="h-12 w-full font-medium text-base transition-all hover:scale-[1.02] active:scale-[0.98]"
        disabled={isDisabled || isConnecting}
        size="lg"
        type="submit"
      >
        {isConnecting ? (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Connecting...
          </div>
        ) : (
          "Start Analysis"
        )}
      </Button>
    </form>
  </Form>
);

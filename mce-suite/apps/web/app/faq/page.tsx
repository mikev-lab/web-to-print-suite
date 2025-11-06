import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function FaqPage() {
  return (
    <div className="container mx-auto max-w-3xl py-12">
      <h1 className="mb-8 text-4xl font-bold">Frequently Asked Questions</h1>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="item-1">
          <AccordionTrigger>Bleed Guide</AccordionTrigger>
          <AccordionContent>
            Placeholder content for Bleed Guide.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>File Setup</AccordionTrigger>
          <AccordionContent>
            Placeholder content for File Setup.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3">
          <AccordionTrigger>Resolution (DPI)</AccordionTrigger>
          <AccordionContent>
            Placeholder content for Resolution (DPI).
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

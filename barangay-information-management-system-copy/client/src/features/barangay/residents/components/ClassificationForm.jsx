import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ClassificationGuide from "@/components/ui/ClassificationGuide";
import { Info } from "lucide-react";

export default function ClassificationForm({
  classificationOptions,
  classifications,
  setClassifications,
  onBack,
  onNext,
  onCancel,
}) {
  return (
    <>
      <div className="mt-2">
        {/* Tip Guide */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <h4 className="font-medium text-blue-900">Quick Tips</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Select multiple classifications if needed</li>
                <li>• Missing a classification? Add it in Settings → Classification tab</li>
                <li>• Some classifications have additional details to fill</li>
              </ul>
            </div>
          </div>
        </div>
        <Label>Classifications</Label>
        {classificationOptions.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 mt-2">
            {classificationOptions.map((opt) => (
              <div key={opt.key} className="flex items-center gap-2">
                <Checkbox
                  id={opt.key}
                  checked={!!classifications[opt.key]}
                  onCheckedChange={(checked) =>
                    setClassifications((c) => ({
                      ...c,
                      [opt.key]: checked ? {} : undefined,
                    }))
                  }
                />
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: opt.color || '#4CAF50' }}
                  />
                  <Label htmlFor={opt.key}>{opt.label}</Label>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <ClassificationGuide />
          </div>
        )}
        {/* Show details for checked classifications */}
        {classificationOptions.length > 0 && classificationOptions
          .filter((opt) => classifications[opt.key])
          .map((opt) => (
            <div
              key={opt.key + "-details"}
              className="mt-4 border rounded p-3 bg-muted/30"
            >
              <div className="font-semibold mb-2">{opt.label} Details</div>
              <div className="grid grid-cols-2 gap-2">
                {opt.details.map((detail) => (
                  <div key={detail.key} className="space-y-1">
                    <Label htmlFor={`${opt.key}-${detail.key}`}>
                      {detail.label}
                    </Label>
                    {detail.type === "select" ? (
                      <Select
                        value={classifications[opt.key]?.[detail.key] || ""}
                        onValueChange={(val) =>
                          setClassifications((c) => ({
                            ...c,
                            [opt.key]: {
                              ...c[opt.key],
                              [detail.key]: val,
                            },
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={`Select ${detail.label.toLowerCase()}`}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {detail.options.map((optItem) => (
                            <SelectItem
                              key={optItem.value}
                              value={optItem.value}
                            >
                              {optItem.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id={`${opt.key}-${detail.key}`}
                        type={detail.type}
                        value={classifications[opt.key]?.[detail.key] || ""}
                        onChange={(e) =>
                          setClassifications((c) => ({
                            ...c,
                            [opt.key]: {
                              ...c[opt.key],
                              [detail.key]: e.target.value,
                            },
                          }))
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>
      <div className="flex justify-between gap-2 mt-6">
        <div>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button
            variant="hero"
            onClick={onNext}
            disabled={classificationOptions.length === 0}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
}

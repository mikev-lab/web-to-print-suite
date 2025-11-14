import { Container, Input, Label } from "@medusajs/ui"
import { useAdminUpdateVariant, useAdminVariants } from "medusa-react"
import { useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import { debounce } from "lodash"

const ProductVariantDetailsWidget = () => {
  const { id, variant_id } = useParams()
  const { variants } = useAdminVariants({ product_id: id, id: variant_id })
  const variant = variants?.[0]
  const { mutate: updateVariant } = useAdminUpdateVariant(id!, variant_id!)

  const [costPerM, setCostPerM] = useState(variant?.costPerM || "")
  const [gsm, setGsm] = useState(variant?.gsm || "")
  const [parentWidth, setParentWidth] = useState(variant?.parentWidth || "")
  const [parentHeight, setParentHeight] = useState(
    variant?.parentHeight || ""
  )

  const debouncedUpdate = debounce((data) => {
    updateVariant(data)
  }, 500)

  useEffect(() => {
    if (variant) {
      setCostPerM(variant.costPerM || "")
      setGsm(variant.gsm || "")
      setParentWidth(variant.parentWidth || "")
      setParentHeight(variant.parentHeight || "")
    }
  }, [variant])

  const handleUpdate = (field, value) => {
    const updateData = {
      [field]: value,
    }

    if (field === "costPerM") {
      setCostPerM(value)
    } else if (field === "gsm") {
      setGsm(value)
    } else if (field === "parentWidth") {
      setParentWidth(value)
    } else if (field === "parentHeight") {
      setParentHeight(value)
    }

    debouncedUpdate({
      ...variant,
      ...updateData,
    })
  }

  return (
    <Container>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Cost Per M</Label>
          <Input
            value={costPerM}
            onChange={(e) => handleUpdate("costPerM", e.target.value)}
          />
        </div>
        <div>
          <Label>GSM</Label>
          <Input
            value={gsm}
            onChange={(e) => handleUpdate("gsm", e.target.value)}
          />
        </div>
        <div>
          <Label>Parent Width</Label>
          <Input
            value={parentWidth}
            onChange={(e) => handleUpdate("parentWidth", e.target.value)}
          />
        </div>
        <div>
          <Label>Parent Height</Label>
          <Input
            value={parentHeight}
            onChange={(e) => handleUpdate("parentHeight", e.target.value)}
          />
        </div>
      </div>
    </Container>
  )
}

import { defineWidgetConfig } from "@medusajs/admin-sdk"

export const config = defineWidgetConfig({
  zone: "variant.details.after",
})

export default ProductVariantDetailsWidget

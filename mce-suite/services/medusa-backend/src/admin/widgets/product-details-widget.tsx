import { Container, Input, Label } from "@medusajs/ui"
import { useAdminProduct, useAdminUpdateProduct } from "medusa-react"
import { useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import { debounce } from "lodash"

const ProductDetailsWidget = () => {
  const { id } = useParams()
  const { product } = useAdminProduct(id!)
  const { mutate: updateProduct } = useAdminUpdateProduct(id!)

  const [usage, setUsage] = useState(product?.usage || "")
  const [type, setType] = useState(product?.type || "")
  const [finish, setFinish] = useState(product?.finish || "")

  const debouncedUpdate = debounce((data) => {
    updateProduct(data)
  }, 500)

  useEffect(() => {
    if (product) {
      setUsage(product.usage || "")
      setType(product.type || "")
      setFinish(product.finish || "")
    }
  }, [product])

  const handleUpdate = (field, value) => {
    const updateData = {
      [field]: value,
    }

    if (field === "usage") {
      setUsage(value)
    } else if (field === "type") {
      setType(value)
    } else if (field === "finish") {
      setFinish(value)
    }

    debouncedUpdate({
      ...product,
      ...updateData,
    })
  }

  return (
    <Container>
      <div className="flex flex-col gap-y-4">
        <div>
          <Label>Usage</Label>
          <Input
            value={usage}
            onChange={(e) => handleUpdate("usage", e.target.value)}
          />
        </div>
        <div>
          <Label>Type</Label>
          <Input
            value={type}
            onChange={(e) => handleUpdate("type", e.target.value)}
          />
        </div>
        <div>
          <Label>Finish</Label>
          <Input
            value={finish}
            onChange={(e) => handleUpdate("finish", e.target.value)}
          />
        </div>
      </div>
    </Container>
  )
}

import { defineWidgetConfig } from "@medusajs/admin-sdk"

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductDetailsWidget

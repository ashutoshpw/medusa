import {
  PriceList,
  MoneyAmount,
  PriceListType,
  PriceListStatus,
  CustomerGroup,
} from "@medusajs/medusa"
import faker from "faker"
import { CannotGetEntityManagerNotConnectedError } from "typeorm"
import { Connection } from "typeorm"

type ProductListPrice = {
  variant_id: string
  currency_code: string
  region_id: string
  amount: number
}

export type PriceListFactoryData = {
  id?: string
  name?: string
  description?: string
  type?: PriceListType
  status?: PriceListStatus
  starts_at?: Date
  ends_at?: Date
  customer_groups?: string[]
  prices?: ProductListPrice[]
}

export const simplePriceListFactory = async (
  connection: Connection,
  data: PriceListFactoryData = {},
  seed?: number
): Promise<PriceList> => {
  if (typeof seed !== "undefined") {
    faker.seed(seed)
  }

  const manager = connection.manager

  const listId = data.id || `simple-price-list-${Math.random() * 1000}`

  let customerGroups = []
  if (typeof data.customer_groups !== "undefined") {
    await manager
      .createQueryBuilder()
      .insert()
      .into(CustomerGroup)
      .values(
        data.customer_groups.map((group) => ({
          id: group,
          name: faker.company.companyName(),
        }))
      )
      .orIgnore()
      .execute()

    customerGroups = await manager.findByIds(
      CustomerGroup,
      data.customer_groups
    )
  }

  const toCreate = {
    id: listId,
    name: data.name || faker.commerce.productName(),
    description: data.description || "Some text",
    status: data.status || PriceListStatus.ACTIVE,
    type: data.type || PriceListType.OVERRIDE,
    starts_at: data.starts_at || null,
    ends_at: data.ends_at || null,
    customer_groups: customerGroups,
  }

  const toSave = manager.create(PriceList, toCreate)
  const toReturn = await manager.save(toSave)

  if (typeof data.prices !== "undefined") {
    for (const ma of data.prices) {
      const factoryData = {
        ...ma,
        price_list_id: listId,
      }
      const toSave = manager.create(MoneyAmount, factoryData)
      await manager.save(toSave)
    }
  }

  return toReturn
}

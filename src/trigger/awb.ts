import { task, runs } from "@trigger.dev/sdk";
import {getAwbData} from "@/trigger/sameday/getAwbData";
import {searchCounty} from "@/trigger/sameday/searchCounty";
import {searchCity} from "@/trigger/sameday/searchCity";
import {createAwb} from "@/trigger/sameday/createAwb";
import {updateAwbDataToDb} from "@/trigger/sameday/updateAwbDataToDb";

type AwbGeneratorPayload = {
  shipmentId: string;
}

export const awbGenerator = task({
  id: "generate-awb",
  // machine: {
  //   preset: "large-1x", // 4 vCPU, 8 GB RAM
  // },
  run: async (payload: {"shipmentId": string}) => {
    // 1. Get AWB data
    const awbDataRun = await getAwbData.triggerAndWait({shipmentId: payload.shipmentId})
    const awbData = await runs.retrieve(awbDataRun.id)
    console.log("Received AWB data: ",{...awbData.output})

    const searchCountyRun = await searchCounty.triggerAndWait({countyName: awbData.output.county})
    const countyId = await runs.retrieve(searchCountyRun.id)
    console.log("Received countyId: ",countyId.output)

    const searchCityRun = await searchCity.triggerAndWait({cityName: awbData.output.city, countyId: countyId.output})
    const city = await runs.retrieve(searchCityRun.id)
    console.log("Received city: ",{...city.output})

    const createAwbRun = await createAwb.triggerAndWait({
      ...awbData.output,
      countyId: countyId.output,
      ...city.output
    })
    const createAwbResponse = await runs.retrieve(createAwbRun.id)
    console.log("Received createAwbResponse: ",createAwbResponse.output)

    const updateDbRun = await updateAwbDataToDb.triggerAndWait({
      shipmentId: payload.shipmentId,
      awbData: createAwbResponse.output
    })
    const updateDbResponse = await runs.retrieve(updateDbRun.id)
    console.log("Received updateDbResponse: ",updateDbResponse.output)

    return true;
  },
});

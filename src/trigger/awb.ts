import { task, runs } from "@trigger.dev/sdk";
import {getAwbData} from "@/trigger/sameday/getAwbData";
import {searchCounty} from "@/trigger/sameday/searchCounty";
import {searchCity} from "@/trigger/sameday/searchCity";
import {createAwb} from "@/trigger/sameday/createAwb";
import {updateDb} from "@/trigger/sameday/updateDb";
import {addAwbToDrive} from "@/trigger/sameday/addAwbToDrive";
import {updateAwbPdfToDb} from "@/trigger/sameday/updateAwbPdfToDb";

type AwbGeneratorPayload = {
  shipmentId: string;
}

export const awbGenerator = task({
  id: "awb-generator",
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

    const updateDbRun = await updateDb.triggerAndWait({
      shipmentId: payload.shipmentId,
      awbData: createAwbResponse.output
    })
    const updateDbResponse = await runs.retrieve(updateDbRun.id)
    console.log("Received updateDbResponse: ",updateDbResponse.output)

    const addAwbToDriveRun = await addAwbToDrive.triggerAndWait({
      shipmentId: payload.shipmentId,
      awbNumber: createAwbResponse.output.awbNumber
    })
    const addAwbToDriveResponse = await runs.retrieve(addAwbToDriveRun.id)
    console.log("Received addAwbToDriveResponse: ",addAwbToDriveResponse.output)

    const updateAwbPdfToDbRun = awaitupdateAwbPdfToDb.triggerAndWait({
      shipmentId: payload.shipmentId,
      awbNumber: createAwbResponse.output.awbNumber,
      recipients: addAwbToDriveResponse.output.results
    })
    const updateAwbPdfToDbResponse = await runs.retrieve(updateAwbPdfToDbRun.id)
    console.log("Received updateAwbPdfToDbResponse: ",updateAwbPdfToDbResponse.output)

    return true;
  },
});

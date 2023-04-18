import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv'
dotenv.config()

const OLD_PROJECT_URL = process.env.OLD_PROJECT_URL!
const OLD_PROJECT_SERVICE_KEY = process.env.OLD_PROJECT_SERVICE_KEY

const NEW_PROJECT_URL = process.env.NEW_PROJECT_URL
const NEW_PROJECT_SERVICE_KEY = process.env.NEW_PROJECT_SERVICE_KEY;

(async () => {

  if (!OLD_PROJECT_URL || !OLD_PROJECT_SERVICE_KEY || !NEW_PROJECT_URL || !NEW_PROJECT_SERVICE_KEY) {
    console.log('Necessário informar todas as Chaves e URLs no .env')
    return
  }

  const oldSupabaseRestClient = createClient(OLD_PROJECT_URL, OLD_PROJECT_SERVICE_KEY, {
    schema: 'storage'
  })

  const oldSupabaseClient = createClient(OLD_PROJECT_URL, OLD_PROJECT_SERVICE_KEY)
  const newSupabaseClient = createClient(NEW_PROJECT_URL, NEW_PROJECT_SERVICE_KEY)

  // make sure you update max_rows in postgrest settings if you have a lot of objects
  // or paginate here
  const { data: oldObjects, error } = await oldSupabaseRestClient.from('objects').select()


  if (error) {
    console.log('error getting objects from old bucket')
    throw oldObjects
  }

  console.log(oldObjects.length)

  let count = 1

  for (const objectData of oldObjects) {

    console.log(count + ' de ' + oldObjects!.length + ' arquivos')

    console.log(`Copiando ... ${objectData.name}`)

    if (objectData.bucket_id !== 'checklist') {

      console.log('Skip...')

      continue

    }

    try {

      const { data, error: downloadObjectError } = await oldSupabaseClient.storage
        .from(objectData.bucket_id)
        .download(objectData.name)

      if (downloadObjectError) {
        console.log(downloadObjectError)
        continue
      }

      const { error: uploadObjectError } = await newSupabaseClient.storage
        .from(objectData.bucket_id)
        .upload(objectData.name, data!, {
          upsert: true,
          contentType: objectData.metadata.mimetype,
          cacheControl: objectData.metadata.cacheControl,
        })

      if (uploadObjectError) {
        throw uploadObjectError
      }

      count++

    } catch (err) {
      console.log('error moving ', objectData)
      console.log(err)
    }
  }
})()

import { Web5 } from '@tbd54566975/dids';
const { web5, did } = await Web5.connect();

Web5.watchDom();

if (localStorage.lastImageId) {
  image_element.setAttribute('src', did + '/records/' + localStorage.lastImageId);
}

file_input.addEventListener('change', async e => {
  console.log(e);
  const file = e.target?.files?.[0];
  if (file) {
    const { record } = await web5.dwn.records.create({
      data    : file,
      message : {
        published  : true,
        dataFormat : file.type
      }
    });

    localStorage.lastImageId = record.id;

    console.log(record);
  }
});
